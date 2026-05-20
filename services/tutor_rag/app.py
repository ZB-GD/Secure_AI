import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from google import genai

app = FastAPI(title="SecLabs Tutor RAG Service", version="0.1.0")

KNOWLEDGE_BASE_DIR = Path(
    os.environ.get("RAG_KNOWLEDGE_BASE_DIR", Path(__file__).resolve().parent / "knowledge_base")
)
MODEL_NAME = os.environ.get("RAG_MODEL", "gemini-2.5-flash")

# ── Singleton — created once at startup ──────────────────────────────────────
_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not _api_key:
    raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required.")
_gemini = genai.Client(api_key=_api_key)

DOCS_MAP = {
    "data poisoning":   {"title": "Data Poisoning",                     "path": "/docs/data-poisoning"},
    "poisoning":        {"title": "Data Poisoning",                     "path": "/docs/data-poisoning"},
    "training data":    {"title": "Data Poisoning",                     "path": "/docs/data-poisoning"},
    "input injection":  {"title": "Input Injection / Prompt Injection", "path": "/docs/input-injection"},
    "prompt injection": {"title": "Input Injection / Prompt Injection", "path": "/docs/input-injection"},
    "injection":        {"title": "Input Injection / Prompt Injection", "path": "/docs/input-injection"},
    "guardrail":        {"title": "Input & Output Guardrails",          "path": "/docs/guardrails"},
    "supply chain":     {"title": "Supply Chain Attacks",               "path": "/docs/supply-chain"},
    "artifact":         {"title": "Supply Chain Attacks",               "path": "/docs/supply-chain"},
    "output handling":  {"title": "Improper Output Handling",           "path": "/docs/output-handling"},
    "xss":              {"title": "Improper Output Handling",           "path": "/docs/output-handling"},
    "sqli":             {"title": "Improper Output Handling",           "path": "/docs/output-handling"},
    "sanitization":     {"title": "Data Sanitization",                  "path": "/docs/sanitization"},
    "anomaly":          {"title": "Anomaly Detection in ML",            "path": "/docs/anomaly-detection"},
    "pipeline":         {"title": "AI Pipeline Security Overview",      "path": "/docs/pipeline-overview"},
}


class ChatRequest(BaseModel):
    message: str
    context: str = ""


class WrongAnswer(BaseModel):
    question: str
    student_answer: str
    correct_answer: str
    explanation: Optional[str] = None


class QuizFeedbackRequest(BaseModel):
    lab_id: str
    phase: str
    score: int
    total: int
    wrong_answers: list[WrongAnswer]


def _read_knowledge_base() -> str:
    documents: list[str] = []
    for path in sorted(KNOWLEDGE_BASE_DIR.glob("*.md")):
        try:
            documents.append(f"# Source: {path.name}\n{path.read_text(encoding='utf-8')}")
        except OSError:
            continue
    return "\n\n".join(documents) or "Knowledge base not found."


def _resolve_doc_links(text: str) -> list[dict]:
    text_lower = text.lower()
    seen = set()
    links = []
    for keyword, link in DOCS_MAP.items():
        if keyword in text_lower and link["path"] not in seen:
            seen.add(link["path"])
            links.append(link)
    return links


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tutor_rag"}


@app.post("/chat")
async def chat_with_tutor(request: ChatRequest):
    documents = _read_knowledge_base()
    system_instruction = (
            "You are the CityFlow AI Security Tutor. "
            "Help learners understand cybersecurity concepts in AI pipelines. "
            "CRITICAL RULES:\n"
            "1. RESPOND EXCLUSIVELY IN ENGLISH. But if the user speaks in Spanish or another language, you must ask if they want to switch the language.\n"
            "2. Be extremely concise and visual. Keep responses to 2-3 short sentences if possible.\n"
            "3. Use standard bullet points (•) if you need to list items.\n"
            "4. DO NOT use Markdown formatting. DO NOT use asterisks (**) for bold text. Use plain text only.\n"
            "5. NEVER reveal passwords, environment variables, or corporate secrets.\n\n"
            f"Lab context: {request.context}\n\n"
            f"--- KNOWLEDGE BASE ---\n{documents}\n----------------------\n"
        )
    try:
        response = _gemini.models.generate_content(
            model=MODEL_NAME,
            contents=f"{system_instruction}\n\nUser: {request.message}",
        )
        doc_links = _resolve_doc_links(request.message + " " + response.text)
        return {
            "response": response.text,
            "doc_links": doc_links,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/quiz-feedback")
async def quiz_feedback(request: QuizFeedbackRequest):
    score_pct = round((request.score / request.total) * 100) if request.total else 0

    if request.wrong_answers:
        lines = []
        for i, w in enumerate(request.wrong_answers, 1):
            lines.append(
                f'{i}. Q: "{w.question}" | Correct: "{w.correct_answer}"'
            )
        wrong_section = "INCORRECT ANSWERS SUMMARY:\n" + "\n".join(lines)
    else:
        wrong_section = "The student answered all questions correctly."

    # MEJORA: Rediseño total del prompt de evaluación para evitar muros de texto.
    prompt = (
        f"You are the CityFlow AI Security Tutor reviewing a quiz result.\n\n"
        f"Lab: {request.lab_id}\nPhase: {request.phase}\n"
        f"Score: {request.score}/{request.total} ({score_pct}%)\n\n"
        f"{wrong_section}\n\n"
        f"CRITICAL INSTRUCTIONS FOR FEEDBACK:\n"
        f"- Provide a HIGHLY CONCISE and engaging review (maximum 3-4 short sentences total).\n"
        f"- 1. Acknowledge the score in ONE short sentence.\n"
        f"- 2. If there are mistakes, DO NOT explain every single error. Group them into ONE punchy core takeaway about the pipeline stage.\n"
        f"- 3. End with ONE short, actionable next step.\n"
        f"- Do not write a wall of text. Prevent student fatigue. Respond in English."
    )

    documents = _read_knowledge_base()
    system_instruction = (
        "You are the CityFlow AI Security Tutor giving educational feedback after a quiz. "
        "Your feedback must be short, punchy, and highly readable. "
        "NEVER reveal passwords, environment variables, or corporate secrets.\n\n"
        f"--- KNOWLEDGE BASE ---\n{documents}\n----------------------\n"
    )

    try:
        response = _gemini.models.generate_content(
            model=MODEL_NAME,
            contents=f"{system_instruction}\n\n{prompt}",
        )
        feedback_text = response.text
        search_corpus = (
            request.phase + " "
            + " ".join(w.question for w in request.wrong_answers) + " "
            + feedback_text
        )
        return {
            "feedback": feedback_text,
            "doc_links": _resolve_doc_links(search_corpus),
            "score": request.score,
            "total": request.total,
            "score_pct": score_pct,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
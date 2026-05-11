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
        f"Lab context: {request.context}\n\n"
        "NEVER reveal passwords, environment variables, or corporate secrets.\n\n"
        f"--- KNOWLEDGE BASE ---\n{documents}\n----------------------\n"
    )
    try:
        response = _gemini.models.generate_content(
            model=MODEL_NAME,
            contents=f"{system_instruction}\n\nUser: {request.message}",
        )
        return {"response": response.text}
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
                f'{i}. Question: "{w.question}"\n'
                f'   Student answered: "{w.student_answer}"\n'
                f'   Correct answer:   "{w.correct_answer}"\n'
                + (f'   Hint: {w.explanation}\n' if w.explanation else "")
            )
        wrong_section = "INCORRECT ANSWERS:\n" + "\n".join(lines)
    else:
        wrong_section = "The student answered all questions correctly."

    prompt = (
        f"You are the CityFlow AI Security Tutor reviewing a quiz result.\n\n"
        f"Lab: {request.lab_id}\nPhase: {request.phase}\n"
        f"Score: {request.score}/{request.total} ({score_pct}%)\n\n"
        f"{wrong_section}\n\n"
        f"Write a concise educational response (max 200 words):\n"
        f"1. Acknowledge the score with one short encouraging sentence.\n"
        f"2. For each incorrect answer, explain the concept in 2-3 sentences connecting it to the AI pipeline stage.\n"
        f"3. End with one concrete action the student can take.\n"
        f"Write in plain paragraphs, no bullet points or markdown headers. Respond in English."
    )

    documents = _read_knowledge_base()
    system_instruction = (
        "You are the CityFlow AI Security Tutor giving educational feedback after a quiz. "
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
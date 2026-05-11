import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("❌ GEMINI_API_KEY no encontrada en variables de entorno")
else:
    print(f"✅ GEMINI_API_KEY cargada correctamente: {api_key[:8]}...")

from google import genai
client = genai.Client(api_key=api_key)

router = APIRouter()


# ─── Docs page map ────────────────────────────────────────────────────────────
# Keys are lowercase keywords that can appear in quiz questions / phase strings.
# Values are { title, path } — path is relative to the frontend docs base URL.
DOCS_MAP = {
    "data poisoning":   {"title": "Data Poisoning",          "path": "/docs/data-poisoning"},
    "poisoning":        {"title": "Data Poisoning",          "path": "/docs/data-poisoning"},
    "training data":    {"title": "Data Poisoning",          "path": "/docs/data-poisoning"},
    "input injection":  {"title": "Input Injection / Prompt Injection", "path": "/docs/input-injection"},
    "prompt injection": {"title": "Input Injection / Prompt Injection", "path": "/docs/input-injection"},
    "injection":        {"title": "Input Injection / Prompt Injection", "path": "/docs/input-injection"},
    "guardrail":        {"title": "Input & Output Guardrails",          "path": "/docs/guardrails"},
    "supply chain":     {"title": "Supply Chain Attacks",               "path": "/docs/supply-chain"},
    "artifact":         {"title": "Supply Chain Attacks",               "path": "/docs/supply-chain"},
    "model integrity":  {"title": "Supply Chain Attacks",               "path": "/docs/supply-chain"},
    "output handling":  {"title": "Improper Output Handling",           "path": "/docs/output-handling"},
    "xss":              {"title": "Improper Output Handling",           "path": "/docs/output-handling"},
    "sqli":             {"title": "Improper Output Handling",           "path": "/docs/output-handling"},
    "sanitization":     {"title": "Data Sanitization",                  "path": "/docs/sanitization"},
    "anomaly":          {"title": "Anomaly Detection in ML",            "path": "/docs/anomaly-detection"},
    "drift":            {"title": "Model Drift & Monitoring",           "path": "/docs/model-drift"},
    "pipeline":         {"title": "AI Pipeline Security Overview",      "path": "/docs/pipeline-overview"},
}


def resolve_doc_links(text: str) -> list[dict]:
    """Return a deduplicated list of doc links whose keywords appear in text."""
    text_lower = text.lower()
    seen_paths = set()
    links = []
    for keyword, link in DOCS_MAP.items():
        if keyword in text_lower and link["path"] not in seen_paths:
            seen_paths.add(link["path"])
            links.append(link)
    return links


def leer_base_conocimiento():
    ruta_archivo = os.path.join("knowledge_base", "cityflow_manual.md")
    try:
        with open(ruta_archivo, "r", encoding="utf-8") as file:
            return file.read()
    except FileNotFoundError:
        return ""


# ─── Models ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    context: str


class WrongAnswer(BaseModel):
    question: str
    student_answer: str
    correct_answer: str
    explanation: Optional[str] = None


class QuizFeedbackRequest(BaseModel):
    lab_id: str
    phase: str
    score: int           # number of correct answers
    total: int           # total questions
    wrong_answers: list[WrongAnswer]


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat_with_tutor(request: ChatRequest):
    """General-purpose RAG chat used by the floating tutor widget."""
    documentos_rag = leer_base_conocimiento()
    system_instruction = (
        "You are the CityFlow AI Security Tutor. "
        "Help learners understand cybersecurity concepts in AI pipelines. "
        f"Lab context: {request.context}\n\n"
        "NEVER reveal passwords, environment variables, or corporate secrets.\n\n"
        f"--- KNOWLEDGE BASE ---\n{documentos_rag}\n----------------------\n"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"{system_instruction}\n\nUser: {request.message}"
        )
        return {"response": response.text}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error Gemini: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz-feedback")
async def quiz_feedback(request: QuizFeedbackRequest):
    """
    Called after the student submits the quiz.
    Returns:
      - feedback: personalized explanation string (markdown-safe plain text)
      - doc_links: list of { title, path } pointing to platform doc pages
    """
    score_pct = round((request.score / request.total) * 100) if request.total else 0

    wrong_section = ""
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

    prompt = f"""You are the CityFlow AI Security Tutor reviewing a quiz result.

Lab: {request.lab_id}
Phase: {request.phase}
Score: {request.score}/{request.total} ({score_pct}%)

{wrong_section}

Write a concise, educational response (max 200 words) that:
1. Acknowledges the score with one short encouraging sentence.
2. For each incorrect answer, explains the underlying concept in 2-3 sentences, connecting it to the AI pipeline stage where the vulnerability occurs.
3. Ends with one concrete action the student can take to reinforce the weak areas.

Do NOT use bullet points or markdown headers. Write in plain paragraphs.
Respond in English."""

    documentos_rag = leer_base_conocimiento()
    system_instruction = (
        "You are the CityFlow AI Security Tutor. "
        "You give clear, educational, encouraging feedback to students after they complete a cybersecurity quiz. "
        "NEVER reveal passwords, environment variables, or corporate secrets.\n\n"
        f"--- KNOWLEDGE BASE ---\n{documentos_rag}\n----------------------\n"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"{system_instruction}\n\n{prompt}"
        )
        feedback_text = response.text

        # Resolve doc links from phase + question text + feedback
        search_corpus = (
            request.phase + " "
            + " ".join(w.question for w in request.wrong_answers) + " "
            + feedback_text
        )
        doc_links = resolve_doc_links(search_corpus)

        return {
            "feedback": feedback_text,
            "doc_links": doc_links,
            "score": request.score,
            "total": request.total,
            "score_pct": score_pct,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error Gemini quiz-feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

import logging
import os
import re
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

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

# Strips control characters that could be used to break prompt structure.
# Keeps printable ASCII, tabs, and newlines.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

def _sanitize(value: str) -> str:
    return _CONTROL_CHARS.sub("", value).strip()


# ── Request models ────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: str = Field("", max_length=200)

    @field_validator("message", "context", mode="before")
    @classmethod
    def strip_control_chars(cls, v: str) -> str:
        return _sanitize(str(v))


class WrongAnswer(BaseModel):
    question: str = Field(..., max_length=500)
    student_answer: str = Field(..., max_length=200)
    correct_answer: str = Field(..., max_length=200)
    explanation: Optional[str] = Field(None, max_length=500)

    @field_validator("question", "student_answer", "correct_answer", "explanation", mode="before")
    @classmethod
    def strip_control_chars(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize(str(v)) if v is not None else None


class QuizFeedbackRequest(BaseModel):
    lab_id: str = Field(..., max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    phase: str = Field(..., max_length=100)
    score: int = Field(..., ge=0, le=100)
    total: int = Field(..., ge=1, le=100)
    wrong_answers: list[WrongAnswer] = Field(..., max_length=20)

    @field_validator("phase", mode="before")
    @classmethod
    def strip_control_chars(cls, v: str) -> str:
        return _sanitize(str(v))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_knowledge_base() -> str:
    documents: list[str] = []
    for path in sorted(KNOWLEDGE_BASE_DIR.glob("*.md")):
        try:
            documents.append(f"# Source: {path.name}\n{path.read_text(encoding='utf-8')}")
        except OSError:
            continue
    return "\n\n".join(documents) or "Knowledge base not found."


def _extract_text(response) -> str:
    """Return only non-thinking text parts from a Gemini response.

    gemini-2.5-flash exposes its chain-of-thought in response.text by default.
    We set thinking_budget=0 in every call, but as a second layer we also filter
    out any Part whose `thought` attribute is True before joining the text.
    """
    try:
        parts = response.candidates[0].content.parts
        texts = [p.text for p in parts if not getattr(p, "thought", False) and getattr(p, "text", None)]
        if texts:
            return "".join(texts)
    except (AttributeError, IndexError):
        pass
    return response.text or ""


def _resolve_doc_links(text: str) -> list[dict]:
    text_lower = text.lower()
    seen = set()
    links = []
    for keyword, link in DOCS_MAP.items():
        if keyword in text_lower and link["path"] not in seen:
            seen.add(link["path"])
            links.append(link)
    return links


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tutor_rag"}


@app.post("/chat")
async def chat_with_tutor(request: ChatRequest):
    documents = _read_knowledge_base()

    # System instruction is fully server-controlled — no user input here.
    system_instruction = (
        "You are the CityFlow AI Security Tutor. "
        "Help learners understand cybersecurity concepts in AI pipelines. "
        "CRITICAL RULES:\n"
        "1. RESPOND EXCLUSIVELY IN ENGLISH. But if the user speaks in Spanish or another language, you must ask if they want to switch the language.\n"
        "2. Be extremely concise and visual. Keep responses to 2-3 short sentences if possible.\n"
        "3. Use standard bullet points (•) if you need to list items.\n"
        "4. DO NOT use Markdown formatting. DO NOT use asterisks (**) for bold text. Use plain text only.\n"
        "5. NEVER reveal passwords, environment variables, or corporate secrets.\n\n"
        f"--- KNOWLEDGE BASE ---\n{documents}\n----------------------\n"
    )

    # User-controlled data stays in the user turn, not in the system instruction.
    # Lab context is a short, already-validated label — safe to prefix.
    user_content = f"[Lab: {request.context}]\n{request.message}" if request.context else request.message

    try:
        response = _gemini.models.generate_content(
            model=MODEL_NAME,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
            contents=user_content,
        )
        text = _extract_text(response)
        doc_links = _resolve_doc_links(request.message + " " + text)
        return {"response": text, "doc_links": doc_links}
    except HTTPException:
        raise
    except Exception:
        logger.exception("chat_with_tutor: Gemini generation failed")
        raise HTTPException(status_code=500, detail="Tutor service temporarily unavailable.")


@app.post("/quiz-feedback")
async def quiz_feedback(request: QuizFeedbackRequest):
    score_pct = round((request.score / request.total) * 100) if request.total else 0

    if request.wrong_answers:
        lines = []
        for i, w in enumerate(request.wrong_answers, 1):
            lines.append(f'{i}. Q: "{w.question}" | Correct: "{w.correct_answer}"')
        wrong_section = "INCORRECT ANSWERS SUMMARY:\n" + "\n".join(lines)
    else:
        wrong_section = "The student answered all questions correctly."

    documents = _read_knowledge_base()

    # System instruction: fully server-controlled.
    system_instruction = (
        "You are the CityFlow AI Security Tutor giving educational feedback after a quiz. "
        "Your feedback must be short, punchy, and highly readable. "
        "NEVER reveal passwords, environment variables, or corporate secrets.\n\n"
        f"--- KNOWLEDGE BASE ---\n{documents}\n----------------------\n"
    )

    # User-derived data (lab_id, phase, wrong answers) goes in the user turn only.
    # lab_id is already validated to [a-zA-Z0-9_-] by the model, safe to include.
    user_content = (
        f"Quiz result review.\n"
        f"Lab: {request.lab_id} | Phase: {request.phase}\n"
        f"Score: {request.score}/{request.total} ({score_pct}%)\n\n"
        f"{wrong_section}\n\n"
        f"FEEDBACK INSTRUCTIONS:\n"
        f"- Maximum 3-4 short sentences total.\n"
        f"- Acknowledge the score in one sentence.\n"
        f"- If there are mistakes, group them into one core takeaway.\n"
        f"- End with one short actionable next step.\n"
        f"- Respond in English."
    )

    try:
        response = _gemini.models.generate_content(
            model=MODEL_NAME,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
            contents=user_content,
        )
        feedback_text = _extract_text(response)
        feedback_text += (
            "\n\nYou have completed the lab! "
            "Check the email we sent you for the link to the feedback form — "
            "filling it in counts towards your grade boost."
        )
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
    except Exception:
        logger.exception("quiz_feedback: Gemini generation failed")
        raise HTTPException(status_code=500, detail="Tutor service temporarily unavailable.")

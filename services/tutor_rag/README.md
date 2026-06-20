# Tutor RAG service

Standalone FastAPI service that powers the in-platform AI tutor. It reads `.md` files from `knowledge_base/` and appends them as context to the system prompt sent to Groq.

## Endpoints

| Endpoint           | Method | Purpose                                                          |
| ------------------- | ------ | ----------------------------------------------------------------- |
| `/chat`             | POST   | Free-form question from a student about the current lab/scenario |
| `/quiz-feedback`    | POST   | Personalized feedback on a student's wrong quiz answers           |

Both endpoints sanitize input (control-character stripping) and `ChatRequest`/`QuizFeedbackRequest` enforce length limits before anything reaches the model.

`/chat` also matches the question against `DOCS_MAP` to recommend a relevant article from the Security Reference library (see `path`/`title` pairs in `app.py`).

## Configuration

| Variable                | Default                              | Purpose                                    |
| ------------------------ | ------------------------------------- | -------------------------------------------- |
| `GROQ_API_KEY`           | *(required, no default)*              | Groq API key; the service fails to start without it |
| `RAG_MODEL`              | `llama-3.3-70b-versatile`             | Groq model used for completions              |
| `RAG_KNOWLEDGE_BASE_DIR` | `./knowledge_base`                    | Directory of `.md` files used as RAG context |

## Running locally

```bash
pip install -r requirements.txt
GROQ_API_KEY=your-key uvicorn app:app --reload --port 8010
```

The backend's `tutor` route (`backend/api/routes/tutor.py`) proxies to this service at `/api/rag/chat`; see [backend/README.md](../../backend/README.md).

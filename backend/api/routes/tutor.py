import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter()

RAG_SERVICE_URL = os.environ.get("RAG_SERVICE_URL", "http://tutor-rag:8010").rstrip("/")


class ChatRequest(BaseModel):
    message: str
    context: str = ""


def _post_json(url: str, payload: dict[str, Any]) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=30.0) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        detail = exc.reason
        if exc.fp is not None:
            detail = exc.fp.read().decode("utf-8", errors="replace") or detail
        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=f"Tutor RAG service unavailable: {exc}") from exc


@router.post("/chat")
async def chat_with_tutor(request: ChatRequest):
    return _post_json(f"{RAG_SERVICE_URL}/chat", request.model_dump())

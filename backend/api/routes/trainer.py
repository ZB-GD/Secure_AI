from fastapi import APIRouter, HTTPException, Request
from typing import Any
import json

from api.services import pipeline_service

router = APIRouter()


@router.post("/retrain")
def proxy_retrain(payload: dict | None = None) -> Any:
    """Proxy a retrain request to the Trainer node.
    Expects JSON body with retrain parameters (e.g., mode, min_rows).
    """
    try:
        return pipeline_service._post_json(
            f"{pipeline_service._normalize_base_url(pipeline_service.TRAINER_URL)}/retrain",
            payload or {},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/status")
def proxy_status() -> Any:
    """Proxy a status/metrics request to the Trainer node."""
    try:
        # Perform a simple GET to the trainer's /status endpoint
        import urllib.request
        target = f"{pipeline_service._normalize_base_url(pipeline_service.TRAINER_URL)}/status"
        with urllib.request.urlopen(target, timeout=5) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

"""
N3 — Actuator  FastAPI service
Wraps nodes/actuator/app.py in an HTTP interface.
Model files are read from /models volume (shared with N4 trainer).

Endpoints:
  POST /infer      Run inference + decision (preprocessing_output + mode in body)
  GET  /health     Health check
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any
import app  # nodes/actuator/app.py

server = FastAPI(title="N3 Actuator")


class InferRequest(BaseModel):
    preprocessing_output: dict[str, Any]
    mode: str = "vulnerable"


@server.post("/infer")
def infer(req: InferRequest):
    return app.run(preprocessing_output=req.preprocessing_output, mode=req.mode)


@server.get("/health")
def health():
    return {"node": "actuator", "status": "ok"}
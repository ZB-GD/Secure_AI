"""
N4 — Model Trainer  FastAPI service
Wraps nodes/model_trainer/app.py in an HTTP interface.
Model files are written to /models volume (shared with N3 actuator).

Endpoints:
  POST /store      Store feature rows from N3 into training DB
  POST /retrain    Trigger retrain (mode in body)
  GET  /status     Current trainer status (rows stored, model info)
  GET  /health     Health check
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any
import app  # nodes/model_trainer/app.py

server = FastAPI(title="N4 Model Trainer")

# Initialise SQLite DB on startup
app.init_db()


class StoreRequest(BaseModel):
    feature_rows: list[dict[str, Any]]


class RetrainRequest(BaseModel):
    mode: str = "vulnerable"   # "clean" | "vulnerable"
    min_rows: int = 50


@server.post("/store")
def store(req: StoreRequest):
    n = app.store_features(req.feature_rows)
    return {"stored": n}


@server.post("/retrain")
def retrain(req: RetrainRequest):
    return app.retrain(mode=req.mode, min_rows=req.min_rows)


@server.get("/status")
def status():
    return app.get_status()


@server.get("/health")
def health():
    return {"node": "trainer", "status": "ok"}
"""
N2 — Edge Preprocessing  FastAPI service
Wraps nodes/edge_preprocessing/app.py in an HTTP interface.

Endpoints:
  POST /process    Process sensor output (sensor_output + mode in body)
  GET  /health     Health check
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any
import app  # nodes/edge_preprocessing/app.py

server = FastAPI(title="N2 Edge Preprocessing")


class ProcessRequest(BaseModel):
    sensor_output: dict[str, Any]
    mode: str = "vulnerable"


@server.post("/process")
def process(req: ProcessRequest):
    return app.run(sensor_output=req.sensor_output, mode=req.mode)


@server.get("/health")
def health():
    return {"node": "edge-preprocessing", "status": "ok"}
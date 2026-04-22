"""
N1 — Sensor Data  FastAPI service
Wraps nodes/sensor_data/app.py in an HTTP interface.

Endpoints:
  POST /run        Run sensor node (mode + n_readings in body)
  GET  /health     Health check
"""

from fastapi import FastAPI
from pydantic import BaseModel
import app  # nodes/sensor_data/app.py (same directory in container)

server = FastAPI(title="N1 Sensor Data")


class RunRequest(BaseModel):
    mode: str = "vulnerable"   # "clean" | "vulnerable"
    n_readings: int = 10


@server.post("/run")
def run(req: RunRequest):
    return app.run(mode=req.mode, n_readings=req.n_readings)


@server.get("/health")
def health():
    return {"node": "sensor-data", "status": "ok"}
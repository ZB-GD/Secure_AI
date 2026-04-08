import os, httpx
from fastapi import FastAPI

app = FastAPI()
NEXT = os.getenv("NEXT_SERVICE", "")
PHASE = "ingestion"

@app.get("/health")
def health():
    return {"phase": PHASE, "status": "ok"}

@app.post("/process")
async def process(payload: dict):
    # Simula trabajo: añade una entrada al log del pipeline
    payload.setdefault("pipeline_log", [])
    payload["pipeline_log"].append(f"{PHASE}: procesado")

    # Pasa al siguiente si existe
    if NEXT:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{NEXT}/process", json=payload, timeout=5)
            return resp.json()
    return payload
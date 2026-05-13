import os
from pathlib import Path
import subprocess
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import health, labs, logs, pipeline, trainer, tutor
from api.services import docker_service

app = FastAPI(title="SecLabs Backend API", version="0.1.0")

# ── API key protection ────────────────────────────────────────────────────────
_API_KEY = os.getenv("API_KEY", "")


@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    if not _API_KEY:
        return await call_next(request)
    # Allow CORS preflight and the health probe used for URL resolution
    if request.method == "OPTIONS" or request.url.path == "/health":
        return await call_next(request)
    if request.headers.get("X-API-Key") != _API_KEY:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── ML model bootstrap ────────────────────────────────────────────────────────
def _ensure_models_ready() -> None:
    base_dir = Path(__file__).resolve().parent
    models_dir = base_dir / "models"

    required_files = [
        models_dir / "clean_model.joblib",
        models_dir / "backdoored_model.joblib",
        models_dir / "training_report.json",
    ]

    missing = [p for p in required_files if not p.exists()]
    if not missing:
        print("[BOOT] ML models found. Skipping training.")
        return

    print("[BOOT] Missing ML model artifacts. Running safe bootstrap training...")
    script_path = base_dir / "scripts" / "train_traffic_models.py"

    try:
        subprocess.run([sys.executable, str(script_path)], check=True, cwd=str(base_dir))
        print("[BOOT] Model bootstrap completed.")
    except subprocess.CalledProcessError as exc:
        print(f"[BOOT] Model bootstrap failed: {exc}")


@app.on_event("startup")
def _startup_bootstrap_models() -> None:
    _ensure_models_ready()
    docker_service.start_lab_cleanup_thread()


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(labs.router, prefix="/labs", tags=["Labs"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(pipeline.router, prefix="/api")
app.include_router(tutor.router, prefix="/api/rag", tags=["Tutor RAG"])
app.include_router(trainer.router, prefix="/api/trainer", tags=["Trainer"])

from fastapi import FastAPI
from api.routes import rag
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import subprocess
import sys

from api.routes import health, labs, logs, pipeline

app = FastAPI(title="SecureAI Backend API", version="0.1.0")


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(labs.router, prefix="/labs", tags=["Labs"])
app.include_router(pipeline.router, prefix="/api")
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(pipeline.router, prefix="/api")

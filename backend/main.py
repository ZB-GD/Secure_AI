import os
from pathlib import Path
import subprocess
import sys

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import health, labs, logs, pipeline, trainer, tutor
from api.services import docker_service
from api.auth.database import init_db
from api.auth.dependencies import get_current_user
from api.auth.router import router as auth_router
from api.auth.service import seed_admin

app = FastAPI(title="SecLabs Backend API", version="0.1.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "DELETE"],
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
def _startup() -> None:
    init_db()

    admin_email = os.getenv("ADMIN_EMAIL", "")
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if admin_email and admin_password:
        seed_admin(admin_email, admin_password)
    else:
        print("[AUTH] ADMIN_EMAIL / ADMIN_PASSWORD not set — admin account not seeded.")

    _ensure_models_ready()
    docker_service.init_novnc_pool()
    docker_service.start_lab_cleanup_thread()


# ── Routers ───────────────────────────────────────────────────────────────────
# Public: auth (login/register handled internally) and health probe.
app.include_router(auth_router)
app.include_router(health.router, tags=["Health"])

# All operational routes require a valid JWT.
_auth = [Depends(get_current_user)]
app.include_router(labs.router, prefix="/labs", tags=["Labs"], dependencies=_auth)
app.include_router(logs.router, prefix="/logs", tags=["Logs"], dependencies=_auth)
app.include_router(pipeline.router, prefix="/api", dependencies=_auth)
app.include_router(tutor.router, prefix="/api/rag", tags=["Tutor RAG"], dependencies=_auth)
app.include_router(trainer.router, prefix="/api/trainer", tags=["Trainer"], dependencies=_auth)

"""
paths.py — resolves model and data paths from environment variables.
Imported by app.py in actuator (N3) and model_trainer (N4).

Set MODELS_DIR and DB_PATH env vars in container runtime (see Dockerfiles).
"""

import os
from pathlib import Path

# Resolve a safe base dir for node containers and helper scripts.
_HERE = Path(__file__).resolve()
if len(_HERE.parents) >= 3:
    _BASE_DIR = _HERE.parents[2]
else:
    _BASE_DIR = _HERE.parent

_MODELS_DIR = _BASE_DIR / "models"

MODELS_DIR = Path(os.environ.get("MODELS_DIR", str(_MODELS_DIR)))
DB_PATH    = Path(os.environ.get("DB_PATH",    str(_BASE_DIR / "data" / "trainer_store.db")))

CLEAN_MODEL_PATH      = MODELS_DIR / "clean_model.joblib"
BACKDOORED_MODEL_PATH = MODELS_DIR / "backdoored_model.joblib"
REPORT_PATH           = MODELS_DIR / "training_report.json"

# Create dirs if they don't exist (safe to call multiple times)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
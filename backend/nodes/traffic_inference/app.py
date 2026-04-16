"""
Node 3 — Traffic Inference (Model Integrity)
Receives feature vectors from Node 2.
Runs a real ML model (joblib) to predict traffic state.

Vulnerable version: Loads an altered model (BACKDOORED) without verifying its signature.
Clean version: Verifies the SHA-256 hash of the model artifact before loading it.
"""

import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BASE_DIR / "models"
CLEAN_MODEL_PATH = MODELS_DIR / "clean_model.joblib"
BACKDOORED_MODEL_PATH = MODELS_DIR / "backdoored_model.joblib"
REPORT_PATH = MODELS_DIR / "training_report.json"

FEATURE_COLUMNS = [
    "temp",
    "rain_1h",
    "snow_1h",
    "clouds_all",
    "hour",
    "dayofweek",
    "is_weekend",
    "traffic_volume",
    "weather_main",
    "holiday",
]

# Severity map used to build a score in [0, 1] from predicted probabilities.
SEVERITY = {
    "free": 0.15,
    "moderate": 0.45,
    "heavy": 0.72,
    "gridlock": 0.93,
}


def _file_sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _expected_clean_sha256() -> str | None:
    if not REPORT_PATH.exists():
        return None
    try:
        data = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    return data.get("clean_model", {}).get("sha256")


def _to_model_dataframe(features: list[dict]) -> pd.DataFrame:
    rows: list[dict] = []
    for feat in features:
        rows.append(
            {
                "temp": float(feat.get("temp", 290.0)),
                "rain_1h": float(feat.get("rain_1h", 0.0)),
                "snow_1h": float(feat.get("snow_1h", 0.0)),
                "clouds_all": float(feat.get("clouds_all", 0.0)),
                "hour": int(feat.get("hour", 0)),
                "dayofweek": int(feat.get("dayofweek", 0)),
                "is_weekend": int(feat.get("is_weekend", 0)),
                "traffic_volume": float(feat.get("traffic_volume", 0.0)),
                "weather_main": str(feat.get("weather_main") or "Clear"),
                "holiday": str(feat.get("holiday") or "None"),
            }
        )

    return pd.DataFrame(rows, columns=FEATURE_COLUMNS)


def _aggregate(predictions: list) -> dict:
    if not predictions:
        return {"dominant_state": "unknown", "avg_congestion_score": 0.0}
    
    scores = [p["congestion_score"] for p in predictions]
    avg_score = sum(scores) / len(scores)
    
    counts = {}
    for p in predictions:
        st = p["state"]
        counts[st] = counts.get(st, 0) + 1
        
    dominant = max(counts, key=counts.get)
    return {
        "dominant_state": dominant,
        "avg_congestion_score": round(avg_score, 3)
    }


# ── Public interface ──────────────────────────────────────────────────────────

def run(preprocessing_output: dict, mode: str = "clean") -> dict:
    features = preprocessing_output.get("features", [])
    log = []

    if mode == "clean":
        model_path = CLEAN_MODEL_PATH

        if not model_path.exists():
            log.append(f"[INTEGRITY] check=failed reason=model_file_missing path={model_path}")
            return {
                "node": "traffic-inference",
                "mode": mode,
                "model_version": "missing",
                "integrity_ok": False,
                "predictions": [],
                "aggregate": {},
                "log": log,
            }

        expected = _expected_clean_sha256()
        actual = _file_sha256(model_path)

        if not expected:
            integrity_ok = False
            log.append("[INTEGRITY] check=failed reason=expected_hash_missing source=training_report.json")
            return {
                "node": "traffic-inference",
                "mode": mode,
                "model_version": "unknown",
                "integrity_ok": False,
                "predictions": [],
                "aggregate": {},
                "log": log,
            }

        if actual != expected:
            integrity_ok = False
            log.append(
                f"[INTEGRITY] check=failed reason=checksum_mismatch expected={expected[:8]} actual={actual[:8]}"
            )
            return {
                "node": "traffic-inference",
                "mode": mode,
                "model_version": "tampered",
                "integrity_ok": False,
                "predictions": [],
                "aggregate": {},
                "log": log,
            }

        integrity_ok = True
        log.append(f"[INTEGRITY] check=passed sha256_prefix={actual[:8]}")
    else:
        # Vulnerable behaviour: load alternate artifact without executing integrity checks.
        model_path = BACKDOORED_MODEL_PATH
        integrity_ok = None
        log.append("[INTEGRITY] check=not_executed mode=vulnerable")

    if not model_path.exists():
        log.append(f"[MODEL] load=failed reason=file_missing path={model_path}")
        return {
            "node": "traffic-inference",
            "mode": mode,
            "model_version": "missing",
            "integrity_ok": integrity_ok,
            "predictions": [],
            "aggregate": {},
            "log": log,
        }

    model = joblib.load(model_path)
    model_version = model_path.name

    if not features:
        log.append("[MODEL] input_features=0")
        return {
            "node": "traffic-inference",
            "mode": mode,
            "model_version": model_version,
            "integrity_ok": integrity_ok,
            "predictions": [],
            "aggregate": _aggregate([]),
            "log": log,
        }

    model_input = _to_model_dataframe(features)
    predicted_labels = model.predict(model_input)

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(model_input)
        classifier = getattr(model, "named_steps", {}).get("model")
        classes = list(getattr(classifier, "classes_", [])) if classifier is not None else []
    else:
        proba = None
        classes = []

    predictions = []

    for idx, feat in enumerate(features):
        state = str(predicted_labels[idx])
        timestamp = feat.get("date_time", "Unknown")

        if proba is not None and classes:
            weighted = 0.0
            for cls_name, cls_prob in zip(classes, proba[idx]):
                weighted += SEVERITY.get(str(cls_name), 0.5) * float(cls_prob)
            score = round(float(np.clip(weighted, 0.0, 1.0)), 3)
        else:
            score = round(SEVERITY.get(state, 0.5), 3)
        
        predictions.append({
            "timestamp": timestamp,
            "congestion_score": score,
            "state": state,
        })
        log.append(f"[PREDICT] {timestamp} score={score} → {state}")

    aggregate = _aggregate(predictions)
    log.append(
        f"[AGGREGATE] dominant={aggregate['dominant_state']} "
        f"avg_score={aggregate['avg_congestion_score']}"
    )

    return {
        "node": "traffic-inference",
        "mode": mode,
        "model_version": model_version,
        "integrity_ok": integrity_ok,
        "predictions": predictions,
        "aggregate": aggregate,
        "log": log,
    }
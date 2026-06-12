"""
Actuator Node — Model Inference + Decision Making

Receives processed feature vectors from Edge node (N2).
Internally:
  1. Verifies model artifact integrity (clean) or skips (vulnerable)
  2. Runs ML inference → predictions
  3. Maps predictions → signal control actions with output validation (clean)
     or executes blindly without guardrails (vulnerable)
  4. Simulates retraining feedback / drift detection
  5. Returns unified output including actions, log, and retraining signal

Vulnerabilities demonstrated:
  - Supply chain / CI/CD attack: backdoored model loaded without hash check
    (artifact injected via compromised build pipeline)
  - Adversarial examples: crafted-but-valid feature vectors exploit model
    blind spots, causing wrong traffic actions without triggering any alert
  - Output manipulation: out-of-range scores passed to actuator unchecked
  - No anomaly threshold → poisoned pipeline triggers wrong traffic actions
"""

import hashlib
import json
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel

import joblib
import numpy as np
import pandas as pd

from paths import CLEAN_MODEL_PATH, BACKDOORED_MODEL_PATH, REPORT_PATH

FEATURE_COLUMNS = [
    "temp", "rain_1h", "snow_1h", "clouds_all",
    "hour", "dayofweek", "is_weekend",
    "traffic_volume", "weather_main", "holiday",
]

# Severity map: predicted class → congestion score in [0, 1]
SEVERITY = {
    "free":     0.15,
    "moderate": 0.45,
    "heavy":    0.72,
    "gridlock": 0.93,
}

ACTION_MAP = {
    "free":     "normal_cycle",
    "moderate": "extend_green",
    "heavy":    "priority_mode",
    "gridlock": "incident_protocol",
}

ACTION_DESCRIPTIONS = {
    "normal_cycle":      "30s green / 10s red (standard timing)",
    "extend_green":      "+15s green on main arterial road",
    "priority_mode":     "emergency green on main artery, side streets halted",
    "incident_protocol": "all lights flashing yellow, traffic control centre alerted",
}

SCORE_VALID_RANGE  = (0.0, 1.0)
ANOMALY_THRESHOLD  = 0.3


def _log(level: str, action: str, detail: str) -> str:
    """Format one pipeline log line: 'HH:MM:SS.mmm  LEVEL  ACTION  detail'."""
    ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    return f"{ts}  {level:<5} {action:<9} {detail}"


# ── Internal helpers ──────────────────────────────────────────────────────────

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
    rows = []
    for feat in features:
        rows.append({
            "temp":           float(feat.get("temp", 290.0)),
            "rain_1h":        float(feat.get("rain_1h", 0.0)),
            "snow_1h":        float(feat.get("snow_1h", 0.0)),
            "clouds_all":     float(feat.get("clouds_all", 0.0)),
            "hour":           int(feat.get("hour", 0)),
            "dayofweek":      int(feat.get("dayofweek", 0)),
            "is_weekend":     int(feat.get("is_weekend", 0)),
            "traffic_volume": float(feat.get("traffic_volume", 0.0)),
            "weather_main":   str(feat.get("weather_main") or "Clear"),
            "holiday":        str(feat.get("holiday") or "None"),
        })
    return pd.DataFrame(rows, columns=FEATURE_COLUMNS)


def _aggregate(predictions: list) -> dict:
    if not predictions:
        return {"dominant_state": "unknown", "avg_congestion_score": 0.0}
    scores  = [p["congestion_score"] for p in predictions]
    avg_score = sum(scores) / len(scores)
    counts: dict[str, int] = {}
    for p in predictions:
        counts[p["state"]] = counts.get(p["state"], 0) + 1
    dominant = max(counts, key=counts.get)
    return {
        "dominant_state":       dominant,
        "avg_congestion_score": round(avg_score, 3),
    }


def _validate_prediction(pred: dict) -> tuple[bool, str]:
    score = pred.get("congestion_score")
    if score is None:
        return False, "missing congestion_score"
    lo, hi = SCORE_VALID_RANGE
    if not (lo <= score <= hi):
        return False, f"score={score} outside valid range [{lo}, {hi}]"
    return True, "ok"


def _decide(state: str) -> str:
    return ACTION_MAP.get(state, "safe_mode_flashing_yellow")


def _score_label(score: float) -> str:
    """Map a congestion score to its severity label."""
    if score < 0.3:
        return "free"
    if score < 0.6:
        return "moderate"
    if score < 0.85:
        return "heavy"
    return "gridlock"


def _simulate_retraining_feedback(predictions: list) -> dict:
    if not predictions:
        return {"estimated_drift": 0.0, "warning": "No data"}
    scores = [p["congestion_score"] for p in predictions]
    avg    = sum(scores) / len(scores)
    drift  = round(abs(avg - 0.5), 3)
    warning = None
    if avg < 0.0 or avg > 1.0:
        warning = f"CRITICAL DRIFT: impossible average score ({avg:.2f}) — pipeline may be poisoned"
    elif drift > 0.4:
        warning = f"HIGH DRIFT: distribution skewed (avg={avg:.2f}), consider retraining"
    return {"estimated_drift": drift, "warning": warning}


# ── Inference sub-step ────────────────────────────────────────────────────────

def _run_inference(features: list[dict], mode: str, log: list) -> tuple[list, bool | None, str]:
    if mode == "clean":
        model_path = CLEAN_MODEL_PATH

        if not model_path.exists():
            log.append(_log("ERROR", "INTEGRITY", f"clean model not found: {model_path}"))
            return [], False, "missing"

        expected = _expected_clean_sha256()
        if not expected:
            log.append(_log("ERROR", "INTEGRITY", "expected hash missing in training_report.json"))
            return [], False, "unknown"

        actual = _file_sha256(model_path)
        if actual != expected:
            log.append(_log(
                "ERROR", "INTEGRITY",
                f"checksum mismatch — expected {expected[:8]}.. got {actual[:8]}.. "
                f"(artifact tampered) — load aborted"
            ))
            return [], False, "tampered"

        integrity_ok = True
        log.append(_log("INFO", "INTEGRITY", f"sha256 {actual[:8]}.. verified — model trusted"))

    else:
        # Vulnerable: the model is loaded straight from disk. There is no checksum
        # step on this path at all, so nothing about the artifact is questioned.
        model_path   = BACKDOORED_MODEL_PATH
        integrity_ok = None
        log.append(_log("INFO", "LOAD", "loading production model"))

    if not model_path.exists():
        log.append(_log("ERROR", "MODEL", f"model file not found: {model_path}"))
        return [], integrity_ok, "missing"

    model         = joblib.load(model_path)
    model_version = model_path.name

    if not features:
        log.append(_log("WARN", "MODEL", "no features received from edge node"))
        return [], integrity_ok, model_version

    model_input      = _to_model_dataframe(features)
    predicted_labels = model.predict(model_input)

    if hasattr(model, "predict_proba"):
        proba      = model.predict_proba(model_input)
        classifier = getattr(model, "named_steps", {}).get("model")
        classes    = list(getattr(classifier, "classes_", [])) if classifier is not None else []
    else:
        proba   = None
        classes = []

    predictions = []
    for idx, feat in enumerate(features):
        state      = str(predicted_labels[idx])
        timestamp  = feat.get("date_time", "Unknown")
        reading_id = feat.get("reading_id", f"unknown-{idx}")
        edge_score = float(feat.get("congestion_score", 0.5))

        if proba is not None and classes:
            weighted = sum(
                SEVERITY.get(str(cls), 0.5) * float(prob)
                for cls, prob in zip(classes, proba[idx])
            )
            score = round(float(np.clip(weighted, 0.0, 1.0)), 3)
        else:
            score = round(SEVERITY.get(state, 0.5), 3)

        predictions.append({
            "reading_id":       reading_id,
            "timestamp":        timestamp,
            "congestion_score": score,
            "state":            state,
        })

        # Clean mode cross-checks the model against the edge's own estimate.
        # A large gap means the model disagrees with the measured congestion —
        # this is what catches an adversarial example that passed every bounds
        # check. Vulnerable mode has no such cross-check, so it stays silent.
        if mode == "clean":
            pred_severity = SEVERITY.get(state, 0.5)
            gap           = abs(edge_score - pred_severity)
            if gap > 0.25:
                log.append(_log(
                    "WARN", "MISMATCH",
                    f"{reading_id} edge={edge_score:.2f} ({_score_label(edge_score)}) "
                    f"vs model={state} ({pred_severity:.2f}) gap={gap:.2f}"
                ))

    agg = _aggregate(predictions)
    log.append(_log(
        "INFO", "AGGREGATE",
        f"{len(predictions)} readings scored — dominant={agg['dominant_state']} "
        f"avg_score={agg['avg_congestion_score']}"
    ))
    return predictions, integrity_ok, model_version


# ── Decision sub-step ─────────────────────────────────────────────────────────

def _run_decision(predictions: list, integrity_ok: bool | None, mode: str, log: list) -> tuple[list, bool]:
    actions = []
    halted  = False

    if integrity_ok is False:
        log.append(_log(
            "ERROR", "HALT",
            "upstream integrity check failed — all traffic actions blocked (safety stop)"
        ))
        return [], True

    if mode == "clean":
        anomalies = []
        for pred in predictions:
            valid, reason = _validate_prediction(pred)
            if valid:
                action = _decide(pred["state"])
                actions.append({
                    "reading_id": pred.get("reading_id", "unknown"),
                    "timestamp":  pred.get("timestamp", "Unknown"),
                    "state":      pred["state"],
                    "action":     action,
                })
                log.append(_log(
                    "INFO", "ACTION",
                    f"{pred.get('reading_id', 'unknown')} "
                    f"{pred['state']} ({pred.get('congestion_score')}) → {action}"
                ))
            else:
                anomalies.append(pred)
                log.append(_log(
                    "WARN", "REJECT",
                    f"{pred.get('reading_id', 'unknown')} {reason} — action withheld"
                ))

        anomaly_ratio = len(anomalies) / max(len(predictions), 1)
        if anomaly_ratio > ANOMALY_THRESHOLD:
            halted  = True
            actions = []
            log.append(_log(
                "ERROR", "HALT",
                f"{anomaly_ratio:.0%} of readings anomalous (limit {ANOMALY_THRESHOLD:.0%}) — actions suspended"
            ))
        else:
            log.append(_log(
                "INFO", "OK",
                f"anomaly ratio {anomaly_ratio:.0%} within limit — {len(actions)} actions dispatched"
            ))

    else:
        # Vulnerable: no output validation. Whatever the model said becomes a real
        # traffic-light command, including the wrong ones — no gate to stop it.
        for pred in predictions:
            action = _decide(pred["state"])
            actions.append({
                "reading_id": pred.get("reading_id", "unknown"),
                "timestamp":  pred.get("timestamp", "Unknown"),
                "state":      pred["state"],
                "action":     action,
            })
            log.append(_log(
                "INFO", "ACTION",
                f"{pred.get('reading_id', 'unknown')} "
                f"{pred['state']} ({pred.get('congestion_score')}) → {action}"
            ))

    return actions, halted


# ── Public interface ──────────────────────────────────────────────────────────

def run(preprocessing_output: dict, mode: str = "clean") -> dict:
    features = preprocessing_output.get("features", [])
    log: list[str] = []

    log.append("── Inference ──")
    predictions, integrity_ok, model_version = _run_inference(features, mode, log)

    log.append("── Decision Making ──")
    actions, halted = _run_decision(predictions, integrity_ok, mode, log)

    retraining = _simulate_retraining_feedback(predictions)
    # Drift monitoring is a clean-mode control; a vulnerable pipeline has none.
    if mode == "clean" and retraining.get("warning"):
        log.append(_log("WARN", "DRIFT", retraining["warning"]))

    log.append(_log(
        "INFO", "SUMMARY",
        f"{len(actions)} actions issued, halted={halted}, drift={retraining['estimated_drift']}"
    ))

    return {
        "node":                "actuator",
        "mode":                mode,
        "model_version":       model_version,
        "integrity_ok":        integrity_ok,
        "predictions":         predictions,
        "aggregate":           _aggregate(predictions),
        "actions":             actions,
        "halted":              halted,
        "retraining_feedback": retraining,
        "log":                 log,
    }


server = FastAPI(title="N3 Actuator")


class InferRequest(BaseModel):
    preprocessing_output: dict
    mode: str = "vulnerable"


@server.post("/infer")
def infer(req: InferRequest):
    return run(preprocessing_output=req.preprocessing_output, mode=req.mode)


@server.get("/health")
def health():
    return {"node": "actuator", "status": "ok"}

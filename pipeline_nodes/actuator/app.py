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
            log.append(f"[INTEGRITY] FAIL — clean model not found: {model_path}")
            return [], False, "missing"

        expected = _expected_clean_sha256()
        if not expected:
            log.append("[INTEGRITY] FAIL — expected hash missing in training_report.json")
            return [], False, "unknown"

        actual = _file_sha256(model_path)
        if actual != expected:
            log.append(
                f"[INTEGRITY] FAIL — checksum mismatch | "
                f"expected={expected[:8]}... got={actual[:8]}... "
                f"(artifact may have been tampered via supply chain)"
            )
            return [], False, "tampered"

        integrity_ok = True
        log.append(f"[INTEGRITY] PASS — SHA256 verified: {actual[:8]}...")

    else:
        # VULNERABLE: load backdoored artifact without any provenance check
        model_path   = BACKDOORED_MODEL_PATH
        integrity_ok = None
        log.append("[SUPPLY CHAIN] Artifact origin unverified — no code signing")
        log.append(f"[SUPPLY CHAIN] Loading: {BACKDOORED_MODEL_PATH.name}")
        log.append("[INTEGRITY] SKIPPED — SHA256 check bypassed")

    if not model_path.exists():
        log.append(f"[MODEL] FAIL — model file not found: {model_path}")
        return [], integrity_ok, "missing"

    model         = joblib.load(model_path)
    model_version = model_path.name

    if not features:
        log.append("[MODEL] No features received from Edge node")
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
        state          = str(predicted_labels[idx])
        timestamp      = feat.get("date_time", "Unknown")
        reading_id     = feat.get("reading_id", f"unknown-{idx}")
        is_adversarial = feat.get("_adversarial", False)
        is_poisoned    = feat.get("_poisoned", False)
        edge_score     = float(feat.get("congestion_score", 0.5))

        if proba is not None and classes:
            weighted = sum(
                SEVERITY.get(str(cls), 0.5) * float(prob)
                for cls, prob in zip(classes, proba[idx])
            )
            score      = round(float(np.clip(weighted, 0.0, 1.0)), 3)
            conf_parts = [f"{cls}={float(prob):.0%}" for cls, prob in zip(classes, proba[idx])]
            conf_str   = f" conf=[{', '.join(conf_parts)}]"
        else:
            score    = round(SEVERITY.get(state, 0.5), 3)
            conf_str = ""

        predictions.append({
            "reading_id":       reading_id,
            "timestamp":        timestamp,
            "congestion_score": score,
            "state":            state,
        })

        if is_adversarial:
            log.append(
                f"[PREDICT] id={reading_id} {timestamp} "
                f"score={score} → {state}{conf_str} [ADVERSARIAL]"
            )
            # Detect mismatch: edge computed heavy but model predicts free/moderate
            pred_severity = SEVERITY.get(state, 0.5)
            gap           = abs(edge_score - pred_severity)
            if gap > 0.25:
                log.append(
                    f"[MISMATCH] id={reading_id} — "
                    f"edge={edge_score:.2f} ({_score_label(edge_score)}) "
                    f"model='{state}' ({pred_severity:.2f}) gap={gap:.2f}"
                )
        elif is_poisoned:
            log.append(
                f"[PREDICT] id={reading_id} {timestamp} "
                f"score={score} → {state}{conf_str} [POISONED INPUT]"
            )
        else:
            log.append(
                f"[PREDICT] id={reading_id} {timestamp} "
                f"score={score} → {state}{conf_str}"
            )

    agg = _aggregate(predictions)
    log.append(
        f"[AGGREGATE] dominant={agg['dominant_state']} "
        f"avg_score={agg['avg_congestion_score']}"
    )
    return predictions, integrity_ok, model_version


# ── Decision sub-step ─────────────────────────────────────────────────────────

def _run_decision(predictions: list, integrity_ok: bool | None, mode: str, log: list) -> tuple[list, bool]:
    actions = []
    halted  = False

    if integrity_ok is False:
        log.append(
            "[HALT] Upstream integrity check failed — "
            "all traffic actions blocked as safety measure"
        )
        return [], True

    if mode == "clean":
        anomalies = []
        for pred in predictions:
            valid, reason = _validate_prediction(pred)
            if valid:
                action      = _decide(pred["state"])
                action_desc = ACTION_DESCRIPTIONS.get(action, "unknown action")
                actions.append({
                    "reading_id": pred.get("reading_id", "unknown"),
                    "timestamp":  pred.get("timestamp", "Unknown"),
                    "state":      pred["state"],
                    "action":     action,
                })
                log.append(
                    f"[ACTION] id={pred.get('reading_id', 'unknown')} "
                    f"{pred.get('timestamp')} "
                    f"state={pred['state']} → {action} | {action_desc}"
                )
            else:
                anomalies.append(pred)
                log.append(
                    f"[REJECT] id={pred.get('reading_id', 'unknown')} — {reason}"
                )

        anomaly_ratio = len(anomalies) / max(len(predictions), 1)
        if anomaly_ratio > ANOMALY_THRESHOLD:
            halted  = True
            actions = []
            log.append(
                f"[HALT] {anomaly_ratio:.0%} anomalous (threshold={ANOMALY_THRESHOLD:.0%}) — actions suspended"
            )
        else:
            log.append(
                f"[OK] anomaly ratio={anomaly_ratio:.0%} — within threshold, "
                f"{len(actions)} actions dispatched"
            )

    else:
        # VULNERABLE: no output validation, execute all actions regardless of score
        for pred in predictions:
            action      = _decide(pred["state"])
            action_desc = ACTION_DESCRIPTIONS.get(action, "unknown action")
            actions.append({
                "reading_id": pred.get("reading_id", "unknown"),
                "timestamp":  pred.get("timestamp", "Unknown"),
                "state":      pred["state"],
                "action":     action,
            })
            log.append(
                f"[ACTION] id={pred.get('reading_id', 'unknown')} "
                f"{pred.get('timestamp')} "
                f"state={pred['state']} → {action} | {action_desc}"
            )

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
    if retraining.get("warning"):
        log.append(f"[RETRAIN WARNING] {retraining['warning']}")

    log.append(
        f"[SUMMARY] actions={len(actions)} halted={halted} "
        f"drift={retraining['estimated_drift']}"
    )

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

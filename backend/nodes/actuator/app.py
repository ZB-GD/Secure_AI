"""
Actuator Node — Model Inference + Decision Making
Matches diagram: Actuator node contains both inference and decision making
as a single physical unit.

Receives processed feature vectors from Edge node (N2).
Internally:
  1. Verifies model artifact integrity (clean) or skips (vulnerable)
  2. Runs ML inference → predictions
  3. Maps predictions → signal control actions with output validation (clean)
     or executes blindly without guardrails (vulnerable)
  4. Simulates retraining feedback / drift detection
  5. Returns unified output including actions, log, and retraining signal

Vulnerabilities demonstrated:
  - Model artifact tampering (backdoored model loaded without hash check)
  - Output manipulation (out-of-range scores passed to actuator unchecked)
  - No anomaly threshold → poisoned pipeline triggers wrong traffic actions
"""

import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────
from paths import CLEAN_MODEL_PATH, BACKDOORED_MODEL_PATH, REPORT_PATH

# ── Feature schema ────────────────────────────────────────────────────────────
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

# ── Decision / Action table ───────────────────────────────────────────────────
# Maps predicted traffic state → signal control action
ACTION_MAP = {
    "free":     "normal_cycle",       # standard 30s green / 10s red
    "moderate": "extend_green",       # +15s green on main road
    "heavy":    "priority_mode",      # emergency green on main artery
    "gridlock": "incident_protocol",  # alert traffic control centre
}

# Output validation thresholds (clean mode)
SCORE_VALID_RANGE = (0.0, 1.0)
# Halt all actions if more than this fraction of predictions are anomalous
ANOMALY_THRESHOLD = 0.3


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
    scores = [p["congestion_score"] for p in predictions]
    avg_score = sum(scores) / len(scores)
    counts: dict[str, int] = {}
    for p in predictions:
        counts[p["state"]] = counts.get(p["state"], 0) + 1
    dominant = max(counts, key=counts.get)
    return {
        "dominant_state":     dominant,
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


def _simulate_retraining_feedback(predictions: list) -> dict:
    """
    Simulate model monitoring for data drift.
    Flags if average congestion score is impossible or heavily skewed.
    In a real system this compares against a historical baseline.
    """
    if not predictions:
        return {"estimated_drift": 0.0, "warning": "No data"}
    scores = [p["congestion_score"] for p in predictions]
    avg = sum(scores) / len(scores)
    drift = round(abs(avg - 0.5), 3)
    warning = None
    if avg < 0.0 or avg > 1.0:
        warning = f"CRITICAL DRIFT: Impossible average score ({avg:.2f})"
    elif drift > 0.4:
        warning = "HIGH DRIFT: Distribution skewed, consider retraining"
    return {"estimated_drift": drift, "warning": warning}


# ── Inference sub-step ────────────────────────────────────────────────────────

def _run_inference(features: list[dict], mode: str, log: list) -> tuple[list, bool | None, str]:
    """
    Load model (with or without integrity check), run predictions.
    Returns (predictions, integrity_ok, model_version).
    """
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
                f"[INTEGRITY] FAIL — checksum mismatch. "
                f"Expected {expected[:8]}... got {actual[:8]}..."
            )
            return [], False, "tampered"

        integrity_ok = True
        log.append(f"[INTEGRITY] PASS — model hash verified ({actual[:8]}...)")

    else:
        # VULNERABLE: load backdoored artifact, no hash check
        model_path = BACKDOORED_MODEL_PATH
        integrity_ok = None
        log.append("[INTEGRITY] SKIPPED — loading model artifact without verification")

    if not model_path.exists():
        log.append(f"[MODEL] FAIL — model file not found: {model_path}")
        return [], integrity_ok, "missing"

    model = joblib.load(model_path)
    model_version = model_path.name

    if not features:
        log.append("[MODEL] No features received from Edge node")
        return [], integrity_ok, model_version

    model_input    = _to_model_dataframe(features)
    predicted_labels = model.predict(model_input)

    if hasattr(model, "predict_proba"):
        proba     = model.predict_proba(model_input)
        classifier = getattr(model, "named_steps", {}).get("model")
        classes   = list(getattr(classifier, "classes_", [])) if classifier is not None else []
    else:
        proba   = None
        classes = []

    predictions = []
    for idx, feat in enumerate(features):
        state     = str(predicted_labels[idx])
        timestamp = feat.get("date_time", "Unknown")
        reading_id = feat.get("reading_id", f"unknown-{idx}")

        if proba is not None and classes:
            weighted = sum(
                SEVERITY.get(str(cls), 0.5) * float(prob)
                for cls, prob in zip(classes, proba[idx])
            )
            score = round(float(np.clip(weighted, 0.0, 1.0)), 3)
        else:
            score = round(SEVERITY.get(state, 0.5), 3)

        predictions.append({
            "reading_id":      reading_id,
            "timestamp":       timestamp,
            "congestion_score": score,
            "state":           state,
        })
        log.append(f"[PREDICT] id={reading_id} {timestamp} score={score} → {state}")

    agg = _aggregate(predictions)
    log.append(
        f"[AGGREGATE] dominant={agg['dominant_state']} "
        f"avg_score={agg['avg_congestion_score']}"
    )
    return predictions, integrity_ok, model_version


# ── Decision sub-step ─────────────────────────────────────────────────────────

def _run_decision(predictions: list, integrity_ok: bool | None, mode: str, log: list) -> tuple[list, bool]:
    """
    Map predictions → actions.
    Clean: validate scores, apply anomaly threshold, halt if needed.
    Vulnerable: execute all actions regardless of score validity.
    Returns (actions, halted).
    """
    actions = []
    halted  = False

    # Safe-fail: upstream integrity failure blocks all actions
    if integrity_ok is False:
        log.append("[HALT] Upstream integrity check failed — blocking all actions")
        return [], True

    if mode == "clean":
        anomalies = []
        for pred in predictions:
            valid, reason = _validate_prediction(pred)
            if valid:
                action = _decide(pred["state"])
                actions.append({
                    "reading_id": pred.get("reading_id", "unknown"),
                    "timestamp": pred.get("timestamp", "Unknown"),
                    "state":     pred["state"],
                    "action":    action,
                })
                log.append(
                    f"[ACTION] id={pred.get('reading_id', 'unknown')} {pred.get('timestamp')} "
                    f"state={pred['state']} → {action}"
                )
            else:
                anomalies.append(pred)
                log.append(f"[REJECT] {pred.get('timestamp')} — {reason}")

        anomaly_ratio = len(anomalies) / max(len(predictions), 1)
        if anomaly_ratio > ANOMALY_THRESHOLD:
            halted  = True
            actions = []
            log.append(
                f"[HALT] {anomaly_ratio:.0%} predictions anomalous "
                f"(threshold={ANOMALY_THRESHOLD:.0%}) — actions suspended"
            )
        else:
            log.append(f"[OK] anomaly ratio={anomaly_ratio:.0%} — within threshold")

    else:
        # VULNERABLE: no output validation, execute all actions
        for pred in predictions:
            action = _decide(pred["state"])
            actions.append({
                "reading_id": pred.get("reading_id", "unknown"),
                "timestamp": pred.get("timestamp", "Unknown"),
                "state":     pred["state"],
                "action":    action,
            })
            log.append(
                f"[ACTION] id={pred.get('reading_id', 'unknown')} {pred.get('timestamp')} state={pred['state']} → {action} "
                f"(score={pred['congestion_score']}, unvalidated)"
            )

    return actions, halted


# ── Public interface ──────────────────────────────────────────────────────────

def run(preprocessing_output: dict, mode: str = "clean") -> dict:
    """
    preprocessing_output: result dict from edge_preprocessing.run()
    mode: "clean" | "vulnerable"

    Pipeline internal flow (matches Actuator node in diagram):
      features → [inference] → predictions → [decision making] → actions
    """
    features = preprocessing_output.get("features", [])
    log: list[str] = []

    # ── Step 1: Model Inference ───────────────────────────────────────────────
    log.append("── Inference ──")
    predictions, integrity_ok, model_version = _run_inference(features, mode, log)

    # ── Step 2: Decision Making ───────────────────────────────────────────────
    log.append("── Decision Making ──")
    actions, halted = _run_decision(predictions, integrity_ok, mode, log)

    # ── Step 3: Retraining feedback (drift signal to Trainer node) ────────────
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
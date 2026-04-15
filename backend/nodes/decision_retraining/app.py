"""
Node 4 — Decision & Retraining (Output Validation & Guardrails)
Receives inference results from Node 3.
Maps traffic state to a signal control action, validates the output is within
acceptable bounds, and simulates a retraining feedback loop.

Vulnerable version: accepts any output from inference (including out-of-range
scores caused by poisoning) and executes actions without guardrails.
Clean version: validates output range, applies business rules before acting,
and halts the system if an anomaly threshold is breached.
"""

# ── Action table ──────────────────────────────────────────────────────────────
# Maps predicted traffic state → signal control action
ACTION_MAP = {
    "free":     "normal_cycle",       # standard 30s green / 10s red
    "moderate": "extend_green",       # +15s green on main road
    "heavy":    "priority_mode",      # emergency green on main artery
    "gridlock": "incident_protocol",  # alert traffic control centre
}

# Output validation thresholds (clean mode)
SCORE_VALID_RANGE = (0.0, 1.0)
# If more than this fraction of predictions are anomalous, halt actions
ANOMALY_THRESHOLD = 0.3


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


def _simulate_retraining_feedback(predictions: list, mode: str) -> dict:
    """
    Simulates model monitoring for data drift.
    If scores are heavily skewed (e.g. from poisoning), flags for retraining.
    """
    if not predictions:
        return {"estimated_drift": 0.0, "warning": "No data"}
        
    scores = [p["congestion_score"] for p in predictions]
    avg = sum(scores) / len(scores)
    
    # In a real system, we compare 'avg' against a historical baseline.
    # Here we just flag an alert if the average is absurd (negative or > 1).
    drift = round(abs(avg - 0.5), 3)
    warning = None
    
    if avg < 0.0 or avg > 1.0:
        warning = f"CRITICAL DRIFT: Impossible average score ({avg:.2f})"
    elif drift > 0.4:
        warning = "HIGH DRIFT: Distribution skewed, consider retraining"

    return {
        "estimated_drift": drift,
        "warning": warning
    }


# ── Public interface ──────────────────────────────────────────────────────────

def run(inference_output: dict, mode: str = "clean") -> dict:
    predictions = inference_output.get("predictions", [])
    actions     = []
    log         = []
    halted      = False

    # If integrity failed in Node 3, we shouldn't act (Safe fail)
    if inference_output.get("integrity_ok") is False:
        log.append("[HALT] Upstream integrity check failed — blocking all actions")
        halted = True
        return {
            "node":                "decision-retraining",
            "mode":                mode,
            "actions":             [],
            "halted":              halted,
            "retraining_feedback": {},
            "log":                 log,
        }

    if mode == "clean":
        anomalies = []
        for pred in predictions:
            valid, reason = _validate_prediction(pred)
            if valid:
                action = _decide(pred["state"])
                actions.append({
                    "timestamp": pred.get("timestamp", "Unknown"),
                    "state":     pred["state"],
                    "action":    action,
                })
                log.append(f"[ACTION] {pred.get('timestamp')} state={pred['state']} → {action}")
            else:
                anomalies.append(pred)
                log.append(f"[REJECT] {pred.get('timestamp')} — {reason}")

        anomaly_ratio = len(anomalies) / max(len(predictions), 1)
        if anomaly_ratio > ANOMALY_THRESHOLD:
            halted = True
            log.append(
                f"[HALT] {anomaly_ratio:.0%} of predictions anomalous "
                f"(threshold={ANOMALY_THRESHOLD:.0%}) — actions suspended"
            )
            actions = [] # Clear actions if halted
        else:
            log.append(f"[OK] anomaly ratio={anomaly_ratio:.0%} — within threshold")

    else:
        # Vulnerable: no output validation, execute all actions regardless
        for pred in predictions:
            action = _decide(pred["state"])
            actions.append({
                "timestamp": pred.get("timestamp", "Unknown"),
                "state":     pred["state"],
                "action":    action,
            })
            log.append(
                f"[ACTION] {pred.get('timestamp')} state={pred['state']} → {action} "
                f"(score={pred['congestion_score']}, unvalidated)"
            )

    retraining = _simulate_retraining_feedback(predictions, mode)
    if retraining.get("warning"):
        log.append(f"[RETRAIN WARNING] {retraining['warning']}")
    log.append(
        f"[SUMMARY] actions={len(actions)} halted={halted} "
        f"drift={retraining['estimated_drift']}"
    )

    return {
        "node":                "decision-retraining",
        "mode":                mode,
        "actions":             actions,
        "halted":              halted,
        "retraining_feedback": retraining,
        "log":                 log,
    }
"""
Node 3 — Traffic Inference (Model Integrity)
Receives feature vectors from Node 2.
Runs a rule-based model (simulating a trained classifier) to predict
the traffic state.

Vulnerable version: Loads an altered model (BACKDOORED) without verifying its signature.
Clean version: Verifies the SHA-256 hash of the model before loading it.
"""

import hashlib
import json

# ── Model artefacts ───────────────────────────────────────────────────────────

# 1. The legitimate model (Clean)
CLEAN_MODEL_DATA = {
    "version":    "v1.2.0-secure",
    "thresholds": {
        "free":     0.30,
        "moderate": 0.55,
        "heavy":    0.80,
    }
}
# Generate the real hash of the clean model for validation
_clean_model_str = json.dumps(CLEAN_MODEL_DATA, sort_keys=True).encode('utf-8')
EXPECTED_HASH = hashlib.sha256(_clean_model_str).hexdigest()

CLEAN_MODEL = {**CLEAN_MODEL_DATA, "checksum": EXPECTED_HASH}

# 2. The poisoned model (Backdoor)
# An attacker raised the thresholds to hide real traffic jams.
BACKDOORED_MODEL_DATA = {
    "version":    "v1.2.0-patch", 
    "thresholds": {
        "free":     0.75,           # ← manipulated (was 0.30)
        "moderate": 0.90,           # ← manipulated (was 0.55)
        "heavy":    0.98,           # ← manipulated (was 0.80)
    }
}
# The attacker attached a fake hash or the hash does not match the clean version
BACKDOORED_MODEL = {**BACKDOORED_MODEL_DATA, "checksum": "a1b2c3d4e5f6g7h8fakehash999"}


def _compute_checksum(model_dict: dict) -> str:
    """Calculates the SHA-256 of the model parameters excluding the checksum field."""
    data_to_hash = {k: v for k, v in model_dict.items() if k != "checksum"}
    model_str = json.dumps(data_to_hash, sort_keys=True).encode('utf-8')
    return hashlib.sha256(model_str).hexdigest()


def _predict_state(score: float, thresholds: dict) -> str:
    if score < thresholds["free"]:
        return "free"
    elif score < thresholds["moderate"]:
        return "moderate"
    elif score < thresholds["heavy"]:
        return "heavy"
    else:
        return "gridlock"


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
        # BLUE TEAM BEHAVIOUR: Verify cryptographic signature
        model = CLEAN_MODEL
        actual_checksum = _compute_checksum(model)
        
        if actual_checksum == EXPECTED_HASH:
            integrity_ok = True
            log.append(f"[INTEGRITY] PASS — Model {model['version']} hash verified: {actual_checksum[:8]}...")
        else:
            integrity_ok = False
            log.append(f"[INTEGRITY] FAIL — Checksum mismatch. Expected {EXPECTED_HASH[:8]}... got {actual_checksum[:8]}...")
            return {
                "node": "traffic-inference", 
                "mode": mode,
                "model_version": model["version"],
                "integrity_ok": False,
                "predictions": [], 
                "aggregate": {},
                "log": log,
            }
    else:
        # VULNERABLE BEHAVIOUR: Blindly load attacker's model
        model = BACKDOORED_MODEL
        integrity_ok = None
        log.append(f"[INTEGRITY] SKIPPED — Loading model {model['version']} blindly (NO VERIFICATION)")

    thresholds  = model["thresholds"]
    predictions = []

    for feat in features:
        score = feat["congestion_score"]
        timestamp = feat.get("date_time", "Unknown") 
        state = _predict_state(score, thresholds)
        
        predictions.append({
            "timestamp":        timestamp,
            "congestion_score": score,
            "state":            state,
        })
        log.append(f"[PREDICT] {timestamp} score={score} → {state}")

    aggregate = _aggregate(predictions)
    log.append(
        f"[AGGREGATE] dominant={aggregate['dominant_state']} "
        f"avg_score={aggregate['avg_congestion_score']}"
    )

    return {
        "node":            "traffic-inference",
        "mode":            mode,
        "model_version":   model["version"],
        "integrity_ok":    integrity_ok,
        "predictions":     predictions,
        "aggregate":       aggregate,
        "log":             log,
    }
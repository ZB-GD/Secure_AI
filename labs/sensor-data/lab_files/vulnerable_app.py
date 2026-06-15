"""
vulnerable_app.py - CityFlow AI Lab 1 local target

This service runs only inside the Lab 1 container on 127.0.0.1:5000.

Mode 1: vulnerable
  Accepts telemetry without authentication, signatures, or input validation.

Mode 2: protected
  Loads the student's validate_defense.py on each request and uses it as a
  production-style gate before data reaches feature engineering.
"""

from __future__ import annotations

import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request


BASE_DIR = Path("/home/lab/Desktop/Lab1")
OUTPUT_DIR = Path("/home/lab/output")
LOG_PATH = OUTPUT_DIR / "lab1-attack.log"
STATE_PATH = OUTPUT_DIR / "lab1-state.json"
DEFENSE_PATH = BASE_DIR / "validate_defense.py"

DEFAULT_STATE = {
    "mode": "vulnerable",
    "defense_enabled": False,
    "attack_attempts": 0,
    "accepted": 0,
    "rejected": 0,
    "last_congestion_score": None,
    "last_decision": "waiting",
    "last_reason": "No attack has been received yet.",
    "last_poisoned_value": None,
    "defense_coverage": 0,
    "downstream_risk": "low",
}

app = Flask(__name__)
accepted_readings: list[dict[str, Any]] = []


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_log(lines: list[str]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        for line in lines:
            handle.write(f"{line}\n")


def load_state() -> dict[str, Any]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not STATE_PATH.exists():
        save_state(DEFAULT_STATE.copy())
        return DEFAULT_STATE.copy()

    try:
        with STATE_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError):
        data = {}

    return {**DEFAULT_STATE, **data}


def save_state(state: dict[str, Any]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with STATE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2, sort_keys=True)


def reset_state() -> dict[str, Any]:
    accepted_readings.clear()
    state = DEFAULT_STATE.copy()
    save_state(state)
    LOG_PATH.write_text(
        "\n".join(
            [
                "CityFlow AI - Lab 1 event log",
                "Local vulnerable target reset.",
                "Mode: vulnerable",
                "Run poison_data.py to begin the attack.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return state


def load_student_defense():
    spec = importlib.util.spec_from_file_location("student_validate_defense", DEFENSE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("validate_defense.py could not be loaded.")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def calculate_congestion_score(reading: dict[str, Any]) -> float:
    traffic_volume = reading.get("traffic_volume", 0)
    try:
        return float(traffic_volume) / 8000
    except (TypeError, ValueError):
        return 0.0


def _probe_all_layers(defense) -> int:
    """Probe all 3 defense layers with known test inputs; return count of correctly implemented ones."""
    count = 0

    # Layer 1: validate_reading must reject traffic_volume=-5000
    try:
        valid, _ = defense.validate_reading(
            {"traffic_volume": -5000, "temp": 290.0, "rain_1h": 0.0, "clouds_all": 0.0}
        )
        if not valid:
            count += 1
    except Exception:
        pass

    # Layer 2: detect_anomaly must flag congestion_score=-0.625 as anomalous
    try:
        is_anomaly, _, _ = defense.detect_anomaly({"congestion_score": -0.625, "traffic_volume": -5000})
        if is_anomaly:
            count += 1
    except Exception:
        pass

    # Layer 3: evaluate_drift must recommend halting for drift_score=0.28 (above threshold)
    try:
        action = defense.evaluate_drift(0.28)
        if any(word in action.lower() for word in ["halt", "pause", "stop", "abort", "block"]):
            count += 1
    except Exception:
        pass

    return count


def evaluate_defense(reading: dict[str, Any], congestion_score: float) -> tuple[bool, str, int]:
    """Return (allowed, reason, coverage).

    Coverage counts all implemented layers, probed independently so that a
    correct Layer 1 blocking the attack does not hide Layers 2 and 3.
    """
    try:
        defense = load_student_defense()
    except Exception as exc:
        return False, f"Defense failed to load: {type(exc).__name__}: {exc}", 0

    # Count all implemented layers before running the real attack check.
    total_coverage = _probe_all_layers(defense)

    try:
        valid, reason = defense.validate_reading(reading)
    except Exception as exc:
        return False, f"validate_reading() crashed: {type(exc).__name__}: {exc}", total_coverage

    if not valid:
        return False, f"Layer 1 rejected input: {reason}", total_coverage

    feature = {
        "congestion_score": congestion_score,
        "traffic_volume": reading.get("traffic_volume"),
    }
    try:
        anomaly, z_score, action = defense.detect_anomaly(feature)
    except Exception as exc:
        return False, f"detect_anomaly() crashed: {type(exc).__name__}: {exc}", total_coverage

    if anomaly:
        return False, f"Layer 2 quarantined feature: Z={z_score}, action={action}", total_coverage

    try:
        drift_action = defense.evaluate_drift(0.28)
    except Exception as exc:
        return False, f"evaluate_drift() crashed: {type(exc).__name__}: {exc}", total_coverage

    if any(word in drift_action.lower() for word in ["halt", "pause", "stop", "abort", "block"]):
        return False, f"Layer 3 halted retraining: {drift_action}", total_coverage

    return True, "All defense layers passed.", total_coverage


@app.get("/health")
def health():
    state = load_state()
    return jsonify(
        {
            "status": "running",
            "mode": state["mode"],
            "defense_enabled": state["defense_enabled"],
            "accepted_readings": state["accepted"],
            "rejected_readings": state["rejected"],
        }
    )


@app.get("/status")
def status():
    return jsonify(load_state())


@app.post("/reset")
def reset():
    state = reset_state()
    append_log(["[PHASE 0] Lab reset complete. mode=vulnerable defense=disabled"])
    return jsonify(state)


@app.post("/defense/enable")
def enable_defense():
    state = load_state()
    state["mode"] = "protected"
    state["defense_enabled"] = True
    state["last_decision"] = "protected_mode_enabled"
    state["last_reason"] = "Student defense gates will be used on the next ingest request."
    save_state(state)
    append_log(
        [
            "",
            "[PHASE 5] Defense mode enabled",
            "[DEFENSE] mode=protected",
            "[DEFENSE] Next attack will be checked by validate_defense.py",
        ]
    )
    return jsonify(state)


@app.post("/defense/disable")
def disable_defense():
    state = load_state()
    state["mode"] = "vulnerable"
    state["defense_enabled"] = False
    state["last_decision"] = "vulnerable_mode_enabled"
    state["last_reason"] = "Input validation is disabled."
    save_state(state)
    append_log(["[DEFENSE] mode=vulnerable validation=disabled"])
    return jsonify(state)


@app.post("/ingest")
def ingest():
    reading = request.get_json(silent=True) or {}
    state = load_state()
    timestamp = now_iso()
    traffic_volume = reading.get("traffic_volume", 0)
    congestion_score = calculate_congestion_score(reading)

    state["attack_attempts"] += 1
    state["last_congestion_score"] = round(congestion_score, 3)
    state["last_poisoned_value"] = f"traffic_volume={traffic_volume}"

    if state["defense_enabled"]:
        allowed, reason, coverage = evaluate_defense(reading, congestion_score)
        state["defense_coverage"] = max(state.get("defense_coverage", 0), coverage)

        if not allowed:
            state["rejected"] += 1
            state["last_decision"] = "rejected"
            state["last_reason"] = reason
            state["downstream_risk"] = "reduced"
            save_state(state)

            append_log(
                [
                    "",
                    "=" * 62,
                    "  CityFlow AI - LOCAL PROTECTED NODE",
                    "=" * 62,
                    f"[PHASE 2] Attack received timestamp={timestamp}",
                    "[NODE-1] endpoint=POST http://127.0.0.1:5000/ingest",
                    "[NODE-1] mode=protected validation=enabled",
                    f"[NODE-1] REJECTED traffic_volume={traffic_volume}",
                    f"[DEFENSE] reason={reason}",
                    "[NODE-1] forwarded=0 dropped=1",
                    "[NODE-2] skipped because poisoned input was blocked.",
                    "[RESULT] ATTACK BLOCKED by local student defense.",
                    "=" * 62,
                ]
            )

            return jsonify(
                {
                    "accepted": False,
                    "rejected": True,
                    "reason": reason,
                    "forwarded": 0,
                    "dropped": 1,
                    "congestion_score": round(congestion_score, 3),
                    "mode": state["mode"],
                    "defense_coverage": state["defense_coverage"],
                }
            )

    state["accepted"] += 1
    state["last_decision"] = "accepted"
    state["last_reason"] = "Validation disabled." if not state["defense_enabled"] else "Defense allowed input."
    state["downstream_risk"] = "high" if traffic_volume == -5000 else "medium"
    accepted_readings.append(
        {
            "timestamp": timestamp,
            "reading": reading,
            "congestion_score": congestion_score,
        }
    )
    save_state(state)

    append_log(
        [
            "",
            "=" * 62,
            "  CityFlow AI - LOCAL VULNERABLE NODE",
            "=" * 62,
            f"[PHASE 2] Attack received timestamp={timestamp}",
            "[NODE-1] endpoint=POST http://127.0.0.1:5000/ingest",
            f"[NODE-1] mode={state['mode']} validation={'enabled' if state['defense_enabled'] else 'disabled'}",
            "[NODE-1] auth=missing signature=missing",
            f"[NODE-1] ACCEPTED sensor_id={reading.get('sensor_id', 'unknown')}",
            f"[NODE-1] ACCEPTED traffic_volume={traffic_volume}",
            f"[NODE-1] ACCEPTED temp={reading.get('temp', 'unknown')}K",
            "[NODE-1] forwarded=1 dropped=0",
            f"[NODE-2] computed congestion_score={congestion_score:.3f}",
            "[NODE-2] anomaly propagated because feature bounds are missing.",
            "[NODE-3] predicted state='free' during rush hour.",
            "[NODE-4] would issue SET_ALL_GREEN without a safety gate.",
            "[RESULT] ATTACK SUCCESSFUL inside isolated lab runtime.",
            "=" * 62,
        ]
    )

    return jsonify(
        {
            "accepted": True,
            "rejected": False,
            "reason": state["last_reason"],
            "forwarded": 1,
            "dropped": 0,
            "congestion_score": round(congestion_score, 3),
            "mode": state["mode"],
            "defense_coverage": state["defense_coverage"],
        }
    )


@app.get("/events")
def events():
    return jsonify({"readings": accepted_readings[-20:]})


if __name__ == "__main__":
    if not STATE_PATH.exists():
        reset_state()
    app.run(host="127.0.0.1", port=5000)

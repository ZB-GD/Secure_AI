"""
vulnerable_app.py - CityFlow AI Lab 1 local vulnerable target

This intentionally broken service runs only inside the Lab 1 container on
127.0.0.1:5000. It accepts telemetry without authentication, signatures, or
input validation so students can attack a local target instead of the real
pipeline.
"""

from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request


LOG_PATH = Path("/home/lab/output/lab1-attack.log")

app = Flask(__name__)
accepted_readings = []


def append_log(lines):
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        for line in lines:
            handle.write(f"{line}\n")


@app.get("/health")
def health():
    return jsonify({"status": "vulnerable", "accepted_readings": len(accepted_readings)})


@app.post("/ingest")
def ingest():
    reading = request.get_json(silent=True) or {}
    now = datetime.now(timezone.utc).isoformat()

    traffic_volume = reading.get("traffic_volume", 0)
    try:
        congestion_score = float(traffic_volume) / 8000
    except (TypeError, ValueError):
        congestion_score = 0.0

    accepted_readings.append(
        {
            "timestamp": now,
            "reading": reading,
            "congestion_score": congestion_score,
        }
    )

    append_log(
        [
            "",
            "=" * 62,
            "  CityFlow AI - LOCAL VULNERABLE NODE",
            "=" * 62,
            f"[NODE-1] timestamp={now}",
            "[NODE-1] endpoint=POST http://127.0.0.1:5000/ingest",
            "[NODE-1] auth=missing signature=missing validation=missing",
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
            "reason": "No authentication or input validation is implemented.",
            "forwarded": 1,
            "dropped": 0,
            "congestion_score": round(congestion_score, 3),
        }
    )


@app.get("/events")
def events():
    return jsonify({"readings": accepted_readings[-20:]})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)

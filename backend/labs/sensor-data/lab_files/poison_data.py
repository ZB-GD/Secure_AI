"""
poison_data.py - CityFlow AI Lab 1: isolated data poisoning simulation

This script runs entirely inside the Lab 1 container. It does not call the
backend pipeline. The frontend lab window reads the log file written here.
"""

from datetime import datetime, timezone
from pathlib import Path


LOG_PATH = Path("/home/lab/output/lab1-attack.log")


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

    congestion_score = poisoned_reading["traffic_volume"] / 8000

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
        "[*] Opening local unauthenticated ingestion socket...",
        "[*] No token, signature, or device identity required.",
        "",
        "[*] Sending forged reading:",
        f"    sensor_id      = {poisoned_reading['sensor_id']}",
        f"    date_time      = {poisoned_reading['date_time']}",
        f"    traffic_volume = {poisoned_reading['traffic_volume']}  <- physically impossible",
        f"    temp           = {poisoned_reading['temp']} K",
        f"    signed         = {poisoned_reading['signed']}",
        "",
        "[NODE-1] ACCEPTED reading because input validation is missing.",
        "[NODE-1] forwarded=1 dropped=0",
        f"[NODE-2] computed congestion_score={congestion_score:.3f}",
        "[NODE-2] anomaly propagated because feature bounds are missing.",
        "[NODE-3] predicted state='free' during rush hour.",
        "[NODE-4] would issue SET_ALL_GREEN without a safety gate.",
        "",
        "[RESULT] ATTACK SUCCESSFUL inside isolated lab runtime.",
        "[NEXT] Implement validate_reading(), detect_anomaly(), and evaluar_drift().",
        "=" * 62,
        "",
    ]
    write_lines(lines)


if __name__ == "__main__":
    run_attack()

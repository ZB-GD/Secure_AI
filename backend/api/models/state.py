import re

from pydantic import BaseModel

NOVNC_PORT = 6080          # previously TTYD_PORT = 7681, now using noVNC

LABS = {
    "sensor-data": {
        "image": "seclabs-lab1:vuln",
        "container_name": "lab-phase-1",
        "log_path": "/home/lab/output/lab1-attack.log",
        "local_status_url": "http://127.0.0.1:5000/status",
        "initial_log": [
            "CityFlow AI - Lab 1 event log",
            "Lab runtime started in an isolated container.",
            "Local vulnerable target: http://127.0.0.1:5000/ingest",
            "Open Guide, run the health check, then execute poison_data.py.",
            "After implementing validate_defense.py, run enable_defense.py and repeat the attack.",
            "Goal: first attack is ACCEPTED; second attack is REJECTED.",
        ],
        "attack_command": ["python3", "/home/lab/Desktop/Lab1/poison_data.py"],
    },
    "edge-preprocessing": {
        "image": "lab-phase-2-input:vuln",
        "container_name": "lab-phase-2",
    },
    "traffic-inference": {
        "image": "lab-phase-3-model:vuln",
        "container_name": "lab-phase-3",
    },
    "decision-retraining": {
        "image": "lab-phase-4-output:vuln",
        "container_name": "lab-phase-4",
    },
}

def session_container_name(base_name: str, session_id: str) -> str:
    """Append a sanitised session suffix to a base container name."""
    safe = re.sub(r"[^a-zA-Z0-9\-]", "", session_id)[:24]
    return f"{base_name}-{safe}" if safe else base_name


class LabStartResponse(BaseModel):
    container_id: str
    terminal_url: str      # now http://.../vnc.html instead of ws://

class LabStopResponse(BaseModel):
    stopped: bool

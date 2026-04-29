from pydantic import BaseModel

NOVNC_PORT = 6080          # previously TTYD_PORT = 7681, now using noVNC

LABS = {
    "sensor-data": {
        "image": "lab-phase-1-ingestion:vuln",
        "container_name": "lab-phase-1",
        "log_path": "/home/lab/output/lab1-attack.log",
        "attack_command": ["python3", "/home/lab/scripts/poison_data.py"],
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

class LabStartResponse(BaseModel):
    container_id: str
    terminal_url: str      # now http://.../vnc.html instead of ws://

class LabStopResponse(BaseModel):
    stopped: bool

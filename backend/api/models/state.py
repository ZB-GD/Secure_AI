from pydantic import BaseModel

NOVNC_PORT = 6080          # antes TTYD_PORT = 7681 — cambiado a noVNC

LABS = {
    "phase-1": {
        "image": "lab-phase-1-ingestion:vuln",
        "container_name": "lab-phase-1",
    },
    "phase-2": {
        "image": "lab-phase-2-input:vuln",
        "container_name": "lab-phase-2",
    },
    "phase-3": {
        "image": "lab-phase-3-model:vuln",
        "container_name": "lab-phase-3",
    },
    "phase-4": {
        "image": "lab-phase-4-output:vuln",
        "container_name": "lab-phase-4",
    },
}

class LabStartResponse(BaseModel):
    container_id: str
    terminal_url: str      # ahora es http://.../vnc.html en vez de ws://

class LabStopResponse(BaseModel):
    stopped: bool
from pydantic import BaseModel

TTYD_PORT = 7681

LABS = {
    "phase-1": {
        "image": "lab-phase-1-ingestion:vuln",
        "container_name": "lab-phase-1",
    },
    "phase-2": {
        "image": "lab-phase-2-input:vuln",
        "container_name": "lab-phase-2",
    },
}

class LabStartResponse(BaseModel):
    container_id: str
    terminal_url: str

class LabStopResponse(BaseModel):
    stopped: bool

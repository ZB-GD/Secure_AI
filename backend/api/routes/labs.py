from fastapi import APIRouter

from api.models.state import LabStartResponse, LabStopResponse
from api.services.docker_service import start_lab_container, stop_lab_container

router = APIRouter()


@router.post("/{phase}/start", response_model=LabStartResponse)
def start_lab_by_phase(phase: str):
    """
    Inicia una fase específica por nombre (phase-1, phase-2).
    """
    return start_lab_container(phase)


@router.post("/{phase}/stop", response_model=LabStopResponse)
def stop_lab_by_phase(phase: str):
    """
    Detiene una fase específica por nombre (phase-1, phase-2).
    """
    return stop_lab_container(phase)
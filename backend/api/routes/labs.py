from fastapi import APIRouter, Request

from api.models.state import LabStartResponse, LabStopResponse
from api.services import docker_service

router = APIRouter()


@router.post("/{node}/start", response_model=LabStartResponse)
def start_lab_by_node(node: str, request: Request):
    """
    Start a specific lab node by name
    (sensor-data, edge-preprocessing, traffic-inference, decision-retraining).
    """
    return docker_service.start_lab_container(node, request.url.hostname)


@router.post("/{node}/stop", response_model=LabStopResponse)
def stop_lab_by_node(node: str):
    """
    Stop a specific lab node by name.
    """
    return docker_service.stop_lab_container(node)

@router.get("/{node}/status")
def get_lab_status(node: str):
    return docker_service.get_lab_status(node)
from fastapi import APIRouter, Query, Request

from api.models.state import LabStartResponse, LabStopResponse
from api.services import docker_service

router = APIRouter()


@router.post("/{node}/start", response_model=LabStartResponse)
def start_lab_by_node(node: str, request: Request, session_id: str = Query(default="shared")):
    return docker_service.start_lab_container(node, request.url.hostname, session_id)


@router.post("/{node}/stop", response_model=LabStopResponse)
def stop_lab_by_node(node: str, session_id: str = Query(default="shared")):
    return docker_service.stop_lab_container(node, session_id)


@router.post("/{node}/heartbeat")
def heartbeat_lab_by_node(node: str, session_id: str = Query(default="shared")):
    return docker_service.record_lab_heartbeat(node, session_id)


@router.get("/{node}/status")
def get_lab_status(node: str, session_id: str = Query(default="shared")):
    return docker_service.get_lab_status(node, session_id)


@router.post("/{node}/attack")
def run_lab_attack(node: str, session_id: str = Query(default="shared")):
    return docker_service.run_lab_attack(node, session_id)

from fastapi import APIRouter, Query

from api.services.log_service import get_lab_logs, get_pipeline_logs

router = APIRouter()


@router.get("/labs/{node}")
def get_lab_logs_by_node(node: str, limit: int = Query(default=200, ge=1, le=2000)):
	return get_lab_logs(node=node, limit=limit)


@router.get("/pipeline/{node}")
def get_pipeline_logs_by_node(node: str, limit: int = Query(default=200, ge=1, le=2000)):
	return get_pipeline_logs(node=node, limit=limit)


@router.get("/{node}")
def get_logs_by_node(node: str, limit: int = Query(default=200, ge=1, le=2000)):
	"""Backward-compatible lab log route."""
	return get_lab_logs(node=node, limit=limit)

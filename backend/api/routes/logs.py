from fastapi import APIRouter, Query

from api.services.log_service import get_lab_logs

router = APIRouter()


@router.get("/{node}")
def get_logs_by_node(node: str, limit: int = Query(default=200, ge=1, le=2000)):
	return get_lab_logs(node=node, limit=limit)

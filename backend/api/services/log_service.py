import docker
from fastapi import HTTPException
import shlex

from api.models.state import LABS


PIPELINE_CONTAINERS = {
	"sensor": "seclabs-sensor",
	"sensor-data": "seclabs-sensor",
	"edge": "seclabs-edge",
	"edge-preprocessing": "seclabs-edge",
	"preprocessing": "seclabs-edge",
	"actuator": "seclabs-actuator",
	"trainer": "seclabs-trainer",
	"model-trainer": "seclabs-trainer",
	"model_trainer": "seclabs-trainer",
	"tutor-rag": "seclabs-tutor-rag",
	"rag": "seclabs-tutor-rag",
}


def _client():
	try:
		return docker.from_env()
	except Exception as e:
		raise HTTPException(status_code=503, detail=f"Docker unavailable: {e}")


def _get_lab_or_404(node: str):
	lab = LABS.get(node)
	if not lab:
		raise HTTPException(status_code=404, detail=f"Node '{node}' is not supported.")
	return lab


def get_lab_logs(node: str, limit: int = 200):
	"""Return latest container log lines for a lab node.

	If a valid lab container is not running yet, return an empty log payload
	instead of a 404 to avoid noisy frontend polling errors.
	"""
	lab = _get_lab_or_404(node)
	container_name = lab["container_name"]
	client = _client()

	safe_limit = max(1, min(limit, 2000))

	try:
		container = client.containers.get(container_name)
		log_path = lab.get("log_path")
		if log_path:
			quoted_path = shlex.quote(log_path)
			result = container.exec_run([
				"sh",
				"-lc",
				f"if [ -f {quoted_path} ]; then tail -n {safe_limit} {quoted_path}; fi",
			])
			text = result.output.decode("utf-8", errors="replace") if result.output else ""
		else:
			raw = container.logs(tail=safe_limit)
			text = raw.decode("utf-8", errors="replace") if isinstance(raw, (bytes, bytearray)) else str(raw)
		lines = [line for line in text.splitlines() if line.strip()]
		return {
			"node": node,
			"container": container_name,
			"status": container.status,
			"lines": lines,
		}
	except docker.errors.NotFound:
		return {
			"node": node,
			"container": container_name,
			"status": "not found",
			"lines": [],
		}
	except docker.errors.APIError as e:
		raise HTTPException(status_code=500, detail=f"Error while fetching logs: {e}")


def get_pipeline_logs(node: str, limit: int = 200):
	"""Return latest Docker stdout/stderr lines for a main pipeline/service container."""
	container_name = PIPELINE_CONTAINERS.get(node)
	if not container_name:
		raise HTTPException(status_code=404, detail=f"Pipeline node '{node}' is not supported.")

	client = _client()
	safe_limit = max(1, min(limit, 2000))

	try:
		container = client.containers.get(container_name)
		raw = container.logs(tail=safe_limit)
		text = raw.decode("utf-8", errors="replace") if isinstance(raw, (bytes, bytearray)) else str(raw)
		lines = [line for line in text.splitlines() if line.strip()]
		return {
			"node": node,
			"container": container_name,
			"status": container.status,
			"lines": lines,
		}
	except docker.errors.NotFound:
		return {
			"node": node,
			"container": container_name,
			"status": "not found",
			"lines": [],
		}
	except docker.errors.APIError as e:
		raise HTTPException(status_code=500, detail=f"Error while fetching pipeline logs: {e}")

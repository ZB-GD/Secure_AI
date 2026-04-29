import os

import docker
from fastapi import HTTPException
from api.models.state import LABS, NOVNC_PORT


def _build_novnc_url(host_port: str, request_host: str | None = None):
    host = request_host or os.getenv("NOVNC_HOST", "localhost")
    return f"http://{host}:{host_port}/vnc.html?autoconnect=1&resize=scale&reconnect=1"


def _get_host_port_or_500(container):
    container.reload()
    ports = container.ports.get(f"{NOVNC_PORT}/tcp")
    if not ports or not ports[0].get("HostPort"):
        raise HTTPException(status_code=500, detail="Could not resolve the container noVNC port.")
    return ports[0]["HostPort"]

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

def start_lab_container(node: str, request_host: str | None = None):
    lab = _get_lab_or_404(node)
    image = lab["image"]
    container_name = lab["container_name"]
    client = _client()

    try:
        existing = client.containers.get(container_name)
        if existing.status == "running":
            host_port = _get_host_port_or_500(existing)
            return {
                "container_id": existing.id,
                "terminal_url": _build_novnc_url(host_port, request_host),
            }
    except docker.errors.NotFound:
        pass

    try:
        container = client.containers.run(
            image,
            name=container_name,
            detach=True,
            remove=True,
            ports={f"{NOVNC_PORT}/tcp": None},
        )
        host_port = _get_host_port_or_500(container)
        return {
            "container_id": container.id,
            "terminal_url": _build_novnc_url(host_port, request_host),
        }
    except docker.errors.ImageNotFound:
        raise HTTPException(status_code=404, detail=f"Docker image '{image}' not found. Build it first.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while starting container: {e}")

def stop_lab_container(node: str):
    lab = _get_lab_or_404(node)
    container_name = lab["container_name"]
    client = _client()

    try:
        container = client.containers.get(container_name)
        container.stop()
        return {"stopped": True}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Node '{node}' is not running.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while stopping container: {e}")

def get_lab_status(node: str):
    lab = _get_lab_or_404(node)
    container_name = lab["container_name"]
    client = _client()

    try:
        container = client.containers.get(container_name)
        return {"status": container.status}
    except docker.errors.NotFound:
        return {"status": "not found"}
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while fetching container status: {e}")


def run_lab_attack(node: str):
    lab = _get_lab_or_404(node)
    command = lab.get("attack_command")
    if not command:
        raise HTTPException(status_code=400, detail=f"Node '{node}' has no isolated attack command.")

    container_name = lab["container_name"]
    client = _client()

    try:
        container = client.containers.get(container_name)
        result = container.exec_run(command)
        output = result.output.decode("utf-8", errors="replace") if result.output else ""
        if result.exit_code != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Attack command failed with exit code {result.exit_code}: {output}",
            )
        return {
            "node": node,
            "container": container_name,
            "status": "completed",
            "lines": [line for line in output.splitlines() if line.strip()],
        }
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Node '{node}' is not running.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while running attack: {e}")

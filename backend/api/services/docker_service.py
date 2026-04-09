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
        raise HTTPException(status_code=500, detail="No se pudo resolver el puerto noVNC del contenedor.")
    return ports[0]["HostPort"]

def _client():
    try:
        return docker.from_env()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Docker no disponible: {e}")

def _get_lab_or_404(phase: str):
    lab = LABS.get(phase)
    if not lab:
        raise HTTPException(status_code=404, detail=f"Fase '{phase}' no soportada.")
    return lab

def start_lab_container(phase: str, request_host: str | None = None):
    lab = _get_lab_or_404(phase)
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
        raise HTTPException(status_code=404, detail=f"Imagen Docker '{image}' no encontrada. Construye la imagen primero.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error al iniciar el contenedor: {e}")

def stop_lab_container(phase: str):
    lab = _get_lab_or_404(phase)
    container_name = lab["container_name"]
    client = _client()

    try:
        container = client.containers.get(container_name)
        container.stop()
        return {"stopped": True}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"La fase '{phase}' no está en ejecución.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error al detener el contenedor: {e}")

def get_lab_status(phase: str):
    lab = _get_lab_or_404(phase)
    container_name = lab["container_name"]
    client = _client()

    try:
        container = client.containers.get(container_name)
        return {"status": container.status}
    except docker.errors.NotFound:
        return {"status": "not found"}
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el estado del contenedor: {e}")
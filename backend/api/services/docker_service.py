import docker
from fastapi import HTTPException

from api.models.state import LABS, TTYD_PORT

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


def start_lab_container(phase: str):
    lab = _get_lab_or_404(phase)
    image = lab["image"]
    container_name = lab["container_name"]

    client = _client()
    try:
        existing = client.containers.get(container_name)
        if existing.status == "running":
            raise HTTPException(status_code=409, detail=f"La fase '{phase}' ya está en ejecución.")
    except docker.errors.NotFound:
        pass
    try:
        container = client.containers.run(
            image,
            name=container_name,
            detach=True,
            remove=True,
            ports={f"{TTYD_PORT}/tcp": None},
        )
        container.reload()
        host_port = container.ports[f"{TTYD_PORT}/tcp"][0]['HostPort']
        return {
            "container_id": container.id,
            "terminal_url": f"ws://localhost:{host_port}",
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
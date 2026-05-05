import json
import os
import shlex
import time

import docker
from fastapi import HTTPException
from api.models.state import LABS, NOVNC_PORT, session_container_name


def _build_novnc_url(host_port: str, request_host: str | None = None):
    host = request_host or os.getenv("NOVNC_HOST", "localhost")
    return f"http://{host}:{host_port}/vnc.html?autoconnect=1&resize=scale&reconnect=1"


def _get_host_port_or_500(container):
    container.reload()
    ports = container.ports.get(f"{NOVNC_PORT}/tcp")
    if not ports or not ports[0].get("HostPort"):
        raise HTTPException(status_code=500, detail="Could not resolve the container noVNC port.")
    return ports[0]["HostPort"]


def _wait_for_novnc(container, timeout_seconds: int = 20) -> None:
    deadline = time.monotonic() + timeout_seconds
    command = [
        "python3",
        "-c",
        (
            "import sys, urllib.request; "
            f"urllib.request.urlopen('http://127.0.0.1:{NOVNC_PORT}/vnc.html', timeout=2).read(1)"
        ),
    ]

    while time.monotonic() < deadline:
        container.reload()
        if container.status != "running":
            raise HTTPException(status_code=500, detail="Lab container stopped before noVNC became ready.")

        result = container.exec_run(command)
        if result.exit_code == 0:
            return
        time.sleep(0.5)

    raise HTTPException(status_code=504, detail="Timed out waiting for noVNC to become ready.")


def _ensure_lab_log(container, lab: dict) -> None:
    log_path = lab.get("log_path")
    if not log_path:
        return

    initial_lines = lab.get("initial_log") or []
    quoted_path = shlex.quote(log_path)
    quoted_parent = shlex.quote(os.path.dirname(log_path))
    initial_text = "\n".join(initial_lines).replace("'", "'\"'\"'")

    command = (
        f"mkdir -p {quoted_parent}; "
        f"if [ ! -s {quoted_path} ]; then "
        f"printf '%s\\n' '{initial_text}' > {quoted_path}; "
        "fi"
    )
    container.exec_run(["sh", "-lc", command])


def _get_local_lab_metrics(container, lab: dict) -> dict:
    status_url = lab.get("local_status_url")
    if not status_url:
        return {}

    result = container.exec_run(
        [
            "python3",
            "-c",
            (
                "import json, urllib.request; "
                f"print(urllib.request.urlopen({status_url!r}, timeout=2).read().decode())"
            ),
        ]
    )
    if result.exit_code != 0 or not result.output:
        return {}

    try:
        state = json.loads(result.output.decode("utf-8", errors="replace"))
    except json.JSONDecodeError:
        return {}

    attack_attempts = int(state.get("attack_attempts") or 0)
    accepted = int(state.get("accepted") or 0)
    rejected = int(state.get("rejected") or 0)
    defense_enabled = bool(state.get("defense_enabled"))
    last_score = state.get("last_congestion_score")
    compromised = accepted > 0 and rejected == 0
    protected = defense_enabled and rejected > 0

    if protected:
        last_event = "Protected mode blocked the poisoned reading."
        status = "protected"
        drift_score = 8
        accuracy = 96.0
    elif compromised:
        last_event = "The local vulnerable node accepted poisoned data."
        status = "compromised"
        drift_score = 28
        accuracy = 61.5
    elif defense_enabled:
        last_event = "Protected mode enabled. Rerun the attack to test it."
        status = "protected"
        drift_score = 12
        accuracy = 98.5
    else:
        last_event = "Local Lab 1 target is waiting for an attack."
        status = "running"
        drift_score = 12
        accuracy = 98.5

    return {
        "status": status,
        "attack_attempts": attack_attempts,
        "accepted_readings": accepted,
        "rejected_readings": rejected,
        "defense_enabled": defense_enabled,
        "mode": state.get("mode", "vulnerable"),
        "defense_coverage": int(state.get("defense_coverage") or 0),
        "congestion_score": "n/a" if last_score is None else str(last_score),
        "drift_score": drift_score,
        "accuracy": accuracy,
        "compromised": compromised,
        "last_event": last_event,
        "last_reason": state.get("last_reason", ""),
        "downstream_risk": state.get("downstream_risk", "low"),
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

def start_lab_container(node: str, request_host: str | None = None, session_id: str = "shared"):
    lab = _get_lab_or_404(node)
    image = lab["image"]
    container_name = session_container_name(lab["container_name"], session_id)
    client = _client()

    try:
        existing = client.containers.get(container_name)
        if existing.status == "running":
            _ensure_lab_log(existing, lab)
            _wait_for_novnc(existing)
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
            mem_limit="768m",
            nano_cpus=1_000_000_000,
            pids_limit=200,
        )
        _ensure_lab_log(container, lab)
        _wait_for_novnc(container)
        host_port = _get_host_port_or_500(container)
        return {
            "container_id": container.id,
            "terminal_url": _build_novnc_url(host_port, request_host),
        }
    except docker.errors.ImageNotFound:
        raise HTTPException(status_code=404, detail=f"Docker image '{image}' not found. Build it first.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while starting container: {e}")

def stop_lab_container(node: str, session_id: str = "shared"):
    lab = _get_lab_or_404(node)
    container_name = session_container_name(lab["container_name"], session_id)
    client = _client()

    try:
        container = client.containers.get(container_name)
        container.stop()
        return {"stopped": True}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Node '{node}' is not running.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while stopping container: {e}")

def get_lab_status(node: str, session_id: str = "shared"):
    lab = _get_lab_or_404(node)
    container_name = session_container_name(lab["container_name"], session_id)
    client = _client()

    try:
        container = client.containers.get(container_name)
        payload = {"status": container.status}
        if container.status == "running":
            payload["terminal_url"] = _build_novnc_url(_get_host_port_or_500(container))
            metrics = _get_local_lab_metrics(container, lab)
            if metrics:
                payload["status"] = metrics.get("status", payload["status"])
                payload["metrics"] = metrics
        return payload
    except docker.errors.NotFound:
        return {"status": "not found"}
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while fetching container status: {e}")


def run_lab_attack(node: str, session_id: str = "shared"):
    lab = _get_lab_or_404(node)
    command = lab.get("attack_command")
    if not command:
        raise HTTPException(status_code=400, detail=f"Node '{node}' has no isolated attack command.")

    container_name = session_container_name(lab["container_name"], session_id)
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

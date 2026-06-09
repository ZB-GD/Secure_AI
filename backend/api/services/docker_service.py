import json
import os
import secrets
import shlex
import threading
import time
from datetime import datetime

import docker
from fastapi import HTTPException
from api.models.state import LABS, NOVNC_PORT, session_container_name


MAX_CONCURRENT_LABS = int(os.getenv("MAX_CONCURRENT_LABS", "20"))
LAB_HEARTBEAT_TIMEOUT_SECONDS = int(os.getenv("LAB_HEARTBEAT_TIMEOUT_SECONDS", "180"))
LAB_CLEANUP_INTERVAL_SECONDS = int(os.getenv("LAB_CLEANUP_INTERVAL_SECONDS", "30"))
LAB_RUNTIME_USER = "1000:1000"
LAB_TMPFS = {
    "/tmp": "",
    "/run": "",
    "/home/lab": "rw,nosuid,nodev,size=256m,uid=1000,gid=1000,mode=755",
}
LAB_CAPABILITIES: list[str] = []

_heartbeat_lock = threading.Lock()
_cleanup_thread_lock = threading.Lock()
_last_seen_by_container: dict[str, float] = {}
_cleanup_thread_started = False

# noVNC port pool — populated at startup from NOVNC_PORT_POOL env var.
# Each entry is (internal_host_port, external_nat_port).
# When the env var is empty the pool is unused and Docker assigns random ports.
_novnc_pool: list[tuple[int, int]] = []
_novnc_pool_lock = threading.Lock()
_novnc_ports_in_use: set[int] = set()


def _parse_novnc_pool() -> list[tuple[int, int]]:
    raw = os.getenv("NOVNC_PORT_POOL", "").strip()
    if not raw:
        return []
    pairs: list[tuple[int, int]] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        if ":" in entry:
            internal_s, external_s = entry.split(":", 1)
            pairs.append((int(internal_s), int(external_s)))
        else:
            port = int(entry)
            pairs.append((port, port))
    return pairs


def init_novnc_pool() -> None:
    """Parse NOVNC_PORT_POOL and pre-claim ports held by containers that survived a restart."""
    global _novnc_pool
    _novnc_pool = _parse_novnc_pool()
    if not _novnc_pool:
        return

    print(f"[NOVNC-POOL] Initialized: {_novnc_pool}", flush=True)

    pool_internal = {ip for ip, _ in _novnc_pool}
    try:
        client = docker.from_env()
        for container in _running_managed_containers(client):
            try:
                bindings = container.ports.get(f"{NOVNC_PORT}/tcp") or []
                for binding in bindings:
                    hp = binding.get("HostPort")
                    if hp and int(hp) in pool_internal:
                        with _novnc_pool_lock:
                            _novnc_ports_in_use.add(int(hp))
                        print(f"[NOVNC-POOL] Pre-claimed port {hp} for {container.name}", flush=True)
            except Exception:
                pass
    except Exception:
        pass


def _acquire_novnc_port() -> tuple[int, int] | None:
    """Return (internal, external) from the pool, or None if no pool is configured (random port).

    Raises 503 when all pool slots are occupied.
    """
    if not _novnc_pool:
        return None
    with _novnc_pool_lock:
        for internal, external in _novnc_pool:
            if internal not in _novnc_ports_in_use:
                _novnc_ports_in_use.add(internal)
                return internal, external
    raise HTTPException(
        status_code=503,
        detail="All noVNC ports are in use. Try again after another lab is stopped.",
    )


def _release_novnc_port(host_port: str | int) -> None:
    with _novnc_pool_lock:
        _novnc_ports_in_use.discard(int(host_port))


def _build_novnc_url(host_port: str, request_host: str | None = None, password: str | None = None) -> str:
    host = request_host or os.getenv("NOVNC_HOST", "localhost")
    # Map internal host port to external NAT port when a pool is configured.
    external_port = host_port
    for internal, external in _novnc_pool:
        if str(internal) == host_port:
            external_port = str(external)
            break
    url = f"http://{host}:{external_port}/vnc.html?autoconnect=1&resize=scale&reconnect=1&compression=2&quality=6&show_dot=true"
    if password:
        url += f"&password={password}"
    return url


def _get_container_vnc_password(container) -> str | None:
    container.reload()
    for entry in container.attrs.get("Config", {}).get("Env") or []:
        if entry.startswith("VNC_PASSWORD="):
            return entry.split("=", 1)[1]
    return None


def _get_host_port_or_500(container):
    container.reload()
    ports = container.ports.get(f"{NOVNC_PORT}/tcp")
    if not ports or not ports[0].get("HostPort"):
        raise HTTPException(status_code=500, detail="Could not resolve the container noVNC port.")
    return ports[0]["HostPort"]


def _wait_for_novnc(container, timeout_seconds: int = 45) -> None:
    deadline = time.monotonic() + timeout_seconds
    # Two-stage check: first confirm websockify is serving HTTP, then confirm
    # the VNC backend (x11vnc on port 5900) is accepting TCP connections.
    # Checking only HTTP is not enough — websockify starts before x11vnc is ready.
    http_check = [
        "python3",
        "-c",
        (
            "import urllib.request; "
            f"urllib.request.urlopen('http://127.0.0.1:{NOVNC_PORT}/vnc.html', timeout=2).read(1)"
        ),
    ]
    vnc_check = [
        "python3",
        "-c",
        "import socket; s=socket.create_connection(('localhost',5900),timeout=2); s.close()",
    ]

    while time.monotonic() < deadline:
        container.reload()
        if container.status != "running":
            raise HTTPException(status_code=500, detail="Lab container stopped before noVNC became ready.")

        try:
            if container.exec_run(http_check).exit_code == 0 and container.exec_run(vnc_check).exit_code == 0:
                return
        except docker.errors.APIError:
            pass  # container stopped between reload() and exec_run(); next iteration handles it
        time.sleep(1)

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
    try:
        container.exec_run(["sh", "-lc", command])
    except docker.errors.APIError:
        pass  # container may have exited; _wait_for_novnc will detect and report this


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

def _managed_container_filters() -> dict:
    return {"label": "seclabs.lab=true"}

def _is_managed_container(container) -> bool:
    labels = container.labels or {}
    if labels.get("seclabs.lab") == "true":
        return True

    names = [lab["container_name"] for lab in LABS.values()]
    return any(container.name.startswith(f"{name}-") for name in names)

def _running_managed_containers(client):
    labeled = client.containers.list(filters=_managed_container_filters())
    by_id = {container.id: container for container in labeled}

    for container in client.containers.list():
        if _is_managed_container(container):
            by_id[container.id] = container

    return list(by_id.values())

def _container_started_at_epoch(container) -> float | None:
    started_at = container.attrs.get("State", {}).get("StartedAt", "")
    if not started_at or started_at.startswith("0001-"):
        return None

    try:
        return datetime.fromisoformat(started_at.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None

def _reconcile_novnc_pool(client) -> None:
    """Release pool slots whose containers have already exited (remove=True auto-removal)."""
    if not _novnc_pool:
        return
    pool_internal = {ip for ip, _ in _novnc_pool}
    active_ports: set[int] = set()
    for container in _running_managed_containers(client):
        try:
            for binding in (container.ports.get(f"{NOVNC_PORT}/tcp") or []):
                hp = binding.get("HostPort")
                if hp and int(hp) in pool_internal:
                    active_ports.add(int(hp))
        except Exception:
            pass
    with _novnc_pool_lock:
        stale = _novnc_ports_in_use - active_ports
        if stale:
            print(f"[NOVNC-POOL] Reconciling: releasing stale ports {stale}", flush=True)
            _novnc_ports_in_use.difference_update(stale)


def _prune_stale_lab_containers(client=None) -> None:
    client = client or _client()
    _reconcile_novnc_pool(client)
    now = time.time()

    for container in _running_managed_containers(client):
        container.reload()
        with _heartbeat_lock:
            last_seen = _last_seen_by_container.get(container.name)

        if last_seen is None:
            last_seen = _container_started_at_epoch(container) or now
            with _heartbeat_lock:
                _last_seen_by_container[container.name] = last_seen

        if now - last_seen <= LAB_HEARTBEAT_TIMEOUT_SECONDS:
            continue

        try:
            print(
                "[LAB-CLEANUP] Stopping stale lab container "
                f"{container.name}; idle_for={int(now - last_seen)}s",
                flush=True,
            )
            try:
                _release_novnc_port(_get_host_port_or_500(container))
            except HTTPException:
                pass
            container.stop()
        except docker.errors.APIError:
            print(
                f"[LAB-CLEANUP] Failed to stop stale lab container {container.name}.",
                flush=True,
            )
            continue

        with _heartbeat_lock:
            _last_seen_by_container.pop(container.name, None)

def _ensure_concurrency_available(client, requested_container_name: str) -> None:
    _prune_stale_lab_containers(client)

    running = [
        container
        for container in _running_managed_containers(client)
        if container.name != requested_container_name
    ]
    if len(running) >= MAX_CONCURRENT_LABS:
        raise HTTPException(
            status_code=503,
            detail=(
                "Maximum concurrent lab containers reached. "
                "Try again after another lab is stopped or cleaned up."
            ),
        )

def _record_heartbeat(container_name: str) -> None:
    with _heartbeat_lock:
        _last_seen_by_container[container_name] = time.time()

def start_lab_cleanup_thread() -> None:
    global _cleanup_thread_started
    with _cleanup_thread_lock:
        if _cleanup_thread_started:
            return
        _cleanup_thread_started = True

    def _run() -> None:
        while True:
            try:
                _prune_stale_lab_containers()
            except Exception as exc:
                print(f"[LAB-CLEANUP] Cleanup pass failed: {exc}", flush=True)
            time.sleep(LAB_CLEANUP_INTERVAL_SECONDS)

    print(
        "[LAB-CLEANUP] Starting cleanup thread; "
        f"timeout={LAB_HEARTBEAT_TIMEOUT_SECONDS}s interval={LAB_CLEANUP_INTERVAL_SECONDS}s",
        flush=True,
    )
    threading.Thread(target=_run, name="lab-container-cleanup", daemon=True).start()

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
        existing.reload()  # always fetch fresh state, .status can be stale
        if existing.status == "running":
            _record_heartbeat(container_name)
            _ensure_lab_log(existing, lab)
            _wait_for_novnc(existing)
            host_port = _get_host_port_or_500(existing)
            return {
                "container_id": existing.id,
                "terminal_url": _build_novnc_url(host_port, request_host, _get_container_vnc_password(existing)),
            }
        else:
            # Stopped/exited container with same name — remove it so we can start fresh.
            try:
                existing.remove(force=True)
            except docker.errors.APIError:
                pass
    except docker.errors.NotFound:
        pass

    try:
        _ensure_concurrency_available(client, container_name)
        port_allocation = _acquire_novnc_port()
        host_port_binding = port_allocation[0] if port_allocation else None
        vnc_password = secrets.token_hex(8)
        try:
            container = client.containers.run(
                image,
                name=container_name,
                detach=True,
                remove=True,
                ports={f"{NOVNC_PORT}/tcp": host_port_binding},
                cap_drop=["ALL"],
                cap_add=LAB_CAPABILITIES,
                read_only=True,
                tmpfs=LAB_TMPFS,
                user=LAB_RUNTIME_USER,
                mem_limit="768m",
                nano_cpus=1_000_000_000,
                pids_limit=200,
                environment={"VNC_PASSWORD": vnc_password},
                labels={
                    "seclabs.lab": "true",
                    "seclabs.node": node,
                    "seclabs.session": session_id,
                },
            )
        except Exception:
            if port_allocation:
                _release_novnc_port(port_allocation[0])
            raise
        _record_heartbeat(container_name)
        _ensure_lab_log(container, lab)
        _wait_for_novnc(container)
        host_port = _get_host_port_or_500(container)
        return {
            "container_id": container.id,
            "terminal_url": _build_novnc_url(host_port, request_host, vnc_password),
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
        try:
            _release_novnc_port(_get_host_port_or_500(container))
        except HTTPException:
            pass
        container.stop()
        with _heartbeat_lock:
            _last_seen_by_container.pop(container_name, None)
        return {"stopped": True}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Node '{node}' is not running.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while stopping container: {e}")

def record_lab_heartbeat(node: str, session_id: str = "shared"):
    lab = _get_lab_or_404(node)
    container_name = session_container_name(lab["container_name"], session_id)
    client = _client()

    try:
        container = client.containers.get(container_name)
        container.reload()
        if container.status != "running":
            return {"status": container.status, "heartbeat": False}
        _record_heartbeat(container_name)
        return {"status": "running", "heartbeat": True}
    except docker.errors.NotFound:
        return {"status": "not found", "heartbeat": False}
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while recording heartbeat: {e}")

def get_lab_status(node: str, request_host: str | None = None, session_id: str = "shared"):
    lab = _get_lab_or_404(node)
    container_name = session_container_name(lab["container_name"], session_id)
    client = _client()

    try:
        container = client.containers.get(container_name)
        payload = {"status": container.status}
        if container.status == "running":
            payload["terminal_url"] = _build_novnc_url(_get_host_port_or_500(container), request_host, _get_container_vnc_password(container))
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


def run_lab_reset(node: str, session_id: str = "shared"):
    lab = _get_lab_or_404(node)
    command = lab.get("reset_command")
    if not command:
        raise HTTPException(status_code=400, detail=f"Node '{node}' has no reset command.")

    container_name = session_container_name(lab["container_name"], session_id)
    client = _client()

    try:
        container = client.containers.get(container_name)
        result = container.exec_run(command)
        output = result.output.decode("utf-8", errors="replace") if result.output else ""
        if result.exit_code != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Reset command failed with exit code {result.exit_code}: {output}",
            )
        return {
            "node": node,
            "container": container_name,
            "status": "reset",
            "lines": [line for line in output.splitlines() if line.strip()],
        }
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Node '{node}' is not running.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error while resetting lab: {e}")


def inject_command_to_terminal(node: str, text: str, session_id: str = "shared") -> dict:
    """Type text into the xfce4-terminal running in the lab container via xdotool."""
    lab = _get_lab_or_404(node)
    container_name = session_container_name(lab["container_name"], session_id)
    client = _client()

    try:
        container = client.containers.get(container_name)

        # Try to bring the terminal window into focus first; non-fatal if it fails
        # (xdotool will still type into whatever window currently has focus).
        container.exec_run(
            ["xdotool", "search", "--onlyvisible", "--class", "xfce4-terminal",
             "windowfocus", "--sync"],
            environment={"DISPLAY": ":1"},
        )

        result = container.exec_run(
            ["xdotool", "type", "--clearmodifiers", "--delay", "20", text],
            environment={"DISPLAY": ":1"},
        )

        if result.exit_code != 0:
            output = result.output.decode("utf-8", errors="replace") if result.output else ""
            raise HTTPException(
                status_code=500,
                detail=f"xdotool type failed (exit {result.exit_code}): {output}",
            )

        return {"status": "injected", "node": node}

    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"Lab container for '{node}' is not running.")
    except docker.errors.APIError as e:
        raise HTTPException(status_code=500, detail=f"Error injecting command: {e}")

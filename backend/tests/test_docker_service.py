from urllib.parse import parse_qs, urlparse

import docker
import pytest
from fastapi import HTTPException

from api.models.state import session_container_name
from api.services import docker_service


class _FakeContainer:
    def __init__(self, id_="abc123"):
        self.id = id_


class _FakeContainers:
    def __init__(self, run_error=None):
        self.run_kwargs = None
        self._run_error = run_error

    def get(self, name):
        raise docker.errors.NotFound("no such container")

    def run(self, image, **kwargs):
        self.run_kwargs = {"image": image, **kwargs}
        if self._run_error:
            raise self._run_error
        return _FakeContainer()


class _FakeClient:
    def __init__(self, run_error=None):
        self.containers = _FakeContainers(run_error=run_error)


def _patch_post_create_steps(monkeypatch):
    """Stub out everything start_lab_container does after client.containers.run()
    so a fake container (which has no real Docker API) doesn't blow up."""
    monkeypatch.setattr(docker_service, "_ensure_concurrency_available", lambda client, name: None)
    monkeypatch.setattr(docker_service, "_ensure_lab_log", lambda container, lab: None)
    monkeypatch.setattr(docker_service, "_wait_for_novnc", lambda container: None)
    monkeypatch.setattr(docker_service, "_get_host_port_or_500", lambda container: "6080")
    monkeypatch.setattr(
        docker_service, "_build_novnc_url", lambda host_port, request_host, password: "http://fake"
    )


def test_start_lab_container_applies_resource_and_capability_hardening(monkeypatch):
    fake_client = _FakeClient()
    monkeypatch.setattr(docker_service, "_client", lambda: fake_client)
    monkeypatch.setattr(docker_service, "_acquire_novnc_port", lambda: None)
    _patch_post_create_steps(monkeypatch)

    docker_service.start_lab_container("sensor-data")

    kwargs = fake_client.containers.run_kwargs
    assert kwargs["cap_drop"] == ["ALL"]
    assert kwargs["cap_add"] == docker_service.LAB_CAPABILITIES
    assert kwargs["read_only"] is True
    assert kwargs["mem_limit"] == "768m"
    assert kwargs["nano_cpus"] == 1_000_000_000
    assert kwargs["pids_limit"] == 200
    assert kwargs["user"] == docker_service.LAB_RUNTIME_USER
    assert kwargs["tmpfs"] == docker_service.LAB_TMPFS


def test_start_lab_container_labels_and_scopes_session(monkeypatch):
    fake_client = _FakeClient()
    monkeypatch.setattr(docker_service, "_client", lambda: fake_client)
    monkeypatch.setattr(docker_service, "_acquire_novnc_port", lambda: None)
    _patch_post_create_steps(monkeypatch)

    docker_service.start_lab_container("sensor-data", session_id="student-7")

    kwargs = fake_client.containers.run_kwargs
    assert kwargs["name"] == "lab-phase-1-student-7"
    assert kwargs["labels"] == {
        "seclabs.lab": "true",
        "seclabs.node": "sensor-data",
        "seclabs.session": "student-7",
    }
    assert "VNC_PASSWORD" in kwargs["environment"]
    assert kwargs["environment"]["VNC_PASSWORD"]


def test_start_lab_container_releases_pooled_port_when_run_fails(monkeypatch):
    fake_client = _FakeClient(run_error=docker.errors.APIError("boom"))
    monkeypatch.setattr(docker_service, "_client", lambda: fake_client)
    monkeypatch.setattr(docker_service, "_acquire_novnc_port", lambda: (6100, 16100))
    released_ports = []
    monkeypatch.setattr(
        docker_service, "_release_novnc_port", lambda host_port: released_ports.append(host_port)
    )
    _patch_post_create_steps(monkeypatch)

    with pytest.raises(HTTPException):
        docker_service.start_lab_container("sensor-data")

    assert released_ports == [6100]


@pytest.mark.parametrize(
    ("host_port", "request_host", "password", "expected_netloc", "expected_password"),
    [
        ("6080", None, None, "localhost:6080", None),
        ("6080", "labs.example.edu", "secret", "labs.example.edu:6080", "secret"),
        ("6100", "public.example.edu", "pw", "public.example.edu:16100", "pw"),
    ],
)
def test_build_novnc_url_uses_host_pool_mapping_and_password(
    monkeypatch, host_port, request_host, password, expected_netloc, expected_password
):
    monkeypatch.setattr(docker_service, "_novnc_pool", [(6100, 16100)])

    url = docker_service._build_novnc_url(
        host_port, request_host=request_host, password=password
    )
    parsed = urlparse(url)
    query = parse_qs(parsed.query)

    assert parsed.scheme == "http"
    assert parsed.netloc == expected_netloc
    assert parsed.path == "/vnc.html"
    assert query["autoconnect"] == ["1"]
    assert query["resize"] == ["scale"]
    assert query["reconnect"] == ["1"]
    assert query["compression"] == ["2"]
    assert query["quality"] == ["6"]
    assert query["show_dot"] == ["true"]
    if expected_password is None:
        assert "password" not in query
    else:
        assert query["password"] == [expected_password]


@pytest.mark.parametrize(
    ("base_name", "session_id", "expected_name"),
    [
        ("lab-phase-1", "shared", "lab-phase-1-shared"),
        ("lab-phase-1", "user_01/../../x", "lab-phase-1-user01x"),
        (
            "lab-phase-1",
            "abcdefghijklmnopqrstuvwxyz123",
            "lab-phase-1-abcdefghijklmnopqrstuvwx",
        ),
        ("lab-phase-1", "$$$", "lab-phase-1"),
    ],
)
def test_session_container_name_sanitizes_session_suffix(
    base_name, session_id, expected_name
):
    assert session_container_name(base_name, session_id) == expected_name

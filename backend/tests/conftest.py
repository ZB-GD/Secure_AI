import importlib.util
import sys
import types
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _install_fastapi_stub() -> None:
    if importlib.util.find_spec("fastapi") is not None:
        return

    fastapi = types.ModuleType("fastapi")

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str | None = None):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class APIRouter:
        def __init__(self, *args, **kwargs):
            pass

        def get(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

    fastapi.HTTPException = HTTPException
    fastapi.APIRouter = APIRouter
    sys.modules["fastapi"] = fastapi


def _install_docker_stub() -> None:
    if importlib.util.find_spec("docker") is not None:
        return

    docker = types.ModuleType("docker")

    class DockerError(Exception):
        pass

    class APIError(DockerError):
        pass

    class ImageNotFound(DockerError):
        pass

    class NotFound(DockerError):
        pass

    def from_env():
        raise DockerError("Docker SDK is not installed in this unit-test environment")

    docker.from_env = from_env
    docker.errors = types.SimpleNamespace(
        APIError=APIError,
        DockerError=DockerError,
        ImageNotFound=ImageNotFound,
        NotFound=NotFound,
    )
    sys.modules["docker"] = docker


def _install_pydantic_stub() -> None:
    if importlib.util.find_spec("pydantic") is not None:
        return

    pydantic = types.ModuleType("pydantic")

    class BaseModel:
        def __init__(self, **data):
            for key, value in data.items():
                setattr(self, key, value)

    pydantic.BaseModel = BaseModel
    sys.modules["pydantic"] = pydantic


_install_fastapi_stub()
_install_docker_stub()
_install_pydantic_stub()

from fastapi import APIRouter
from api.services.pipeline_service import run_scenario

router = APIRouter(
    prefix="/scenarios",
    tags=["Pipeline Scenarios"]
)


def _run_progressive_scenario(scenario_id: int, clean_nodes: int):
    node_modes = {
        "sensor": "clean" if clean_nodes >= 1 else "vulnerable",
        "edge": "clean" if clean_nodes >= 2 else "vulnerable",
        "actuator": "clean" if clean_nodes >= 3 else "vulnerable",
        "trainer": "clean" if clean_nodes >= 4 else "vulnerable",
    }
    return run_scenario(scenario_id=scenario_id, node_modes=node_modes, n_readings=10)


@router.get("/1/run")
def run_scenario_1():
    """Executes Scenario 1: all nodes vulnerable."""
    return _run_progressive_scenario(scenario_id=1, clean_nodes=0)


@router.get("/2/run")
def run_scenario_2():
    """Executes Scenario 2: Node 1 clean, remaining nodes vulnerable."""
    return _run_progressive_scenario(scenario_id=2, clean_nodes=1)


@router.get("/3/run")
def run_scenario_3():
    """Executes Scenario 3: Nodes 1 and 2 clean, remaining nodes vulnerable."""
    return _run_progressive_scenario(scenario_id=3, clean_nodes=2)


@router.get("/4/run")
def run_scenario_4():
    """Executes Scenario 4: Nodes 1 to 3 clean, trainer still vulnerable."""
    return _run_progressive_scenario(scenario_id=4, clean_nodes=3)


@router.get("/5/run")
def run_scenario_5():
    """Executes Scenario 5: all nodes clean."""
    return _run_progressive_scenario(scenario_id=5, clean_nodes=4)
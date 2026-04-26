from fastapi import APIRouter, HTTPException
from api.services.pipeline_service import run_scenario

router = APIRouter(
    prefix="/scenarios",
    tags=["Pipeline Scenarios"]
)


@router.get("/1/run")
def run_scenario_1():
    """Executes Scenario 1: Vulnerable Pipeline End-to-End."""
    return run_scenario(scenario_id=1, mode="vulnerable", n_readings=10)


# @router.get("/2/run")
# def run_scenario_2():
#     """Executes Scenario 2: Clean Pipeline."""
#     return run_scenario(scenario_id=2, mode="clean", n_readings=10)
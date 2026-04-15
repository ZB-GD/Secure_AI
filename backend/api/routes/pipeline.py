from fastapi import APIRouter
import math
from typing import Any

# Import the main pipeline function.
# Adjust this import path depending on your folder structure.
from run_pipeline import run_pipeline 

# Create the router to group all pipeline-related routes
router = APIRouter(
    prefix="/scenarios",
    tags=["Pipeline Scenarios"]
)


def _json_safe(value: Any):
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value

@router.get("/1/run")
def run_scenario_1_vulnerable():
    """
    Executes Scenario 1: Vulnerable Pipeline End-to-End.
    """
    # Run the pipeline in vulnerable mode
    # (Ensure run_pipeline returns the data instead of just printing it)
    pipeline_results = run_pipeline(mode="vulnerable", n_readings=10)
    safe_results = _json_safe(pipeline_results)
    
    return {
        "scenario": 1,
        "status": "success",
        "data": safe_results,
    }

# Add scenario 2 here later:
# @router.get("/2/run")
# def run_scenario_2_clean(): ...
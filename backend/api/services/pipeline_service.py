"""
Pipeline service — business logic layer.
"""

import math
from typing import Any
from fastapi import HTTPException

from run_pipeline import run_pipeline


def _json_safe(value: Any) -> Any:
    """Recursively replace non-finite floats (NaN/Inf) with None for JSON safety."""
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def run_scenario(scenario_id: int, mode: str, n_readings: int) -> dict:
    """
    Run pipeline for a given scenario and return a JSON-safe response dict.
    Raises HTTPException on pipeline failure.
    """
    try:
        results = run_pipeline(mode=mode, n_readings=n_readings)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}") from exc

    return {
        "scenario": scenario_id,
        "status":   "success",
        "data":     _json_safe(results),
    }
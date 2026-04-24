"""
Pipeline service — business logic layer.

In containerized mode, the backend orchestrates the nodes over HTTP so each
node can run as an independent microservice container.
"""

import json
import math
import os
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException


SENSOR_URL = os.getenv("PIPELINE_SENSOR_URL", "http://sensor:8001")
EDGE_URL = os.getenv("PIPELINE_EDGE_URL", "http://edge:8002")
ACTUATOR_URL = os.getenv("PIPELINE_ACTUATOR_URL", "http://actuator:8003")


def _normalize_base_url(url: str) -> str:
    return url.rstrip("/")


def _post_json(url: str, payload: dict[str, Any], *, timeout: float = 10.0, retries: int = 3) -> dict:
    """POST JSON and return a decoded JSON response."""
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=timeout) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except HTTPError as exc:
            detail = ""
            if exc.fp is not None:
                detail = exc.fp.read().decode("utf-8", errors="replace")
            raise HTTPException(
                status_code=502,
                detail=f"Pipeline node call failed for {url}: {exc.code} {detail or exc.reason}",
            ) from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(0.5)
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Pipeline node unavailable at {url}: {exc}",
            ) from exc

    raise HTTPException(status_code=502, detail=f"Pipeline node unavailable at {url}: {last_error}")


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
        sensor_output = _post_json(
            f"{_normalize_base_url(SENSOR_URL)}/run",
            {"mode": mode, "n_readings": n_readings},
        )
        edge_output = _post_json(
            f"{_normalize_base_url(EDGE_URL)}/process",
            {"sensor_output": sensor_output, "mode": mode},
        )
        actuator_output = _post_json(
            f"{_normalize_base_url(ACTUATOR_URL)}/infer",
            {"preprocessing_output": edge_output, "mode": mode},
        )

        results = {
            "n1": sensor_output,
            "n2": edge_output,
            "n3": actuator_output,
        }

        n1_readings = sensor_output.get("readings", []) if isinstance(sensor_output, dict) else []
        n1_dropped = sensor_output.get("dropped", []) if isinstance(sensor_output, dict) else []
        n2_features = edge_output.get("features", []) if isinstance(edge_output, dict) else []
        n3_predictions = actuator_output.get("predictions", []) if isinstance(actuator_output, dict) else []
        n3_actions = actuator_output.get("actions", []) if isinstance(actuator_output, dict) else []
        retraining_feedback = actuator_output.get("retraining_feedback", {}) if isinstance(actuator_output, dict) else {}

        poisoned_count = sum(1 for row in n1_readings if isinstance(row, dict) and row.get("_poisoned"))
        anomalous_count = sum(
            1
            for feature in n2_features
            if isinstance(feature, dict)
            and isinstance(feature.get("congestion_score"), (int, float))
            and not (0.0 <= float(feature["congestion_score"]) <= 1.0)
        )

        metrics = {
            "mode": mode,
            "readings_received": len(n1_readings),
            "readings_dropped": len(n1_dropped),
            "poisoned_readings": poisoned_count,
            "features_generated": len(n2_features),
            "anomalous_features": anomalous_count,
            "predictions_generated": len(n3_predictions),
            "actions_generated": len(n3_actions),
            "dominant_state": (actuator_output.get("aggregate") or {}).get("dominant_state", "unknown"),
            "avg_congestion_score": (actuator_output.get("aggregate") or {}).get("avg_congestion_score", 0.0),
            "integrity_ok": actuator_output.get("integrity_ok"),
            "halted": actuator_output.get("halted", False),
            "drift_score": retraining_feedback.get("estimated_drift", 0.0),
            "risk_level": "high" if actuator_output.get("halted") or poisoned_count > 0 or anomalous_count > 0 else "normal",
            "summary": (
                f"{len(n1_readings)} readings -> {len(n2_features)} features -> "
                f"{len(n3_predictions)} predictions -> {len(n3_actions)} actions"
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}") from exc

    return {
        "scenario": scenario_id,
        "status":   "success",
        "metrics":  metrics,
        "data":     _json_safe(results),
    }
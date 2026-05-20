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
TRAINER_URL = os.getenv("PIPELINE_TRAINER_URL", "http://trainer:8004")

RETRAIN_DRIFT_THRESHOLD = float(os.getenv("PIPELINE_RETRAIN_DRIFT_THRESHOLD", "0.25"))
RETRAIN_MIN_ROWS = int(os.getenv("PIPELINE_RETRAIN_MIN_ROWS", "50"))

NODE_ORDER = ("sensor", "edge", "actuator", "trainer")


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


def _try_post_json(url: str, payload: dict[str, Any]) -> tuple[dict | None, str | None]:
    """Best-effort POST: return payload or a compact error message."""
    try:
        return _post_json(url, payload), None
    except HTTPException as exc:
        return None, str(exc.detail)


def _node_mode(node_modes: dict[str, str], node_name: str) -> str:
    return node_modes.get(node_name, "vulnerable")


def run_scenario(scenario_id: int, node_modes: dict[str, str], n_readings: int) -> dict:
    """
    Run pipeline for a given scenario and return a JSON-safe response dict.
    Raises HTTPException on pipeline failure.
    """
    try:
        # Measure per-node latency for observability
        t0 = time.time()

        sensor_mode = _node_mode(node_modes, "sensor")
        edge_mode = _node_mode(node_modes, "edge")
        actuator_mode = _node_mode(node_modes, "actuator")
        trainer_mode = _node_mode(node_modes, "trainer")

        sensor_start = time.time()
        sensor_output = _post_json(
            f"{_normalize_base_url(SENSOR_URL)}/run",
            {"mode": sensor_mode, "n_readings": n_readings},
        )
        sensor_latency = max(0.0, (time.time() - sensor_start) * 1000.0)

        edge_start = time.time()
        edge_output = _post_json(
            f"{_normalize_base_url(EDGE_URL)}/process",
            {"sensor_output": sensor_output, "mode": edge_mode},
        )
        edge_latency = max(0.0, (time.time() - edge_start) * 1000.0)

        actuator_start = time.time()
        actuator_output = _post_json(
            f"{_normalize_base_url(ACTUATOR_URL)}/infer",
            {"preprocessing_output": edge_output, "mode": actuator_mode},
        )
        actuator_latency = max(0.0, (time.time() - actuator_start) * 1000.0)

        total_pipeline_ms = max(0.0, (time.time() - t0) * 1000.0)

        n2_features = edge_output.get("features", []) if isinstance(edge_output, dict) else []
        retraining_feedback = actuator_output.get("retraining_feedback", {}) if isinstance(actuator_output, dict) else {}
        drift_score = float(retraining_feedback.get("estimated_drift", 0.0) or 0.0)

        trainer_store_result, trainer_store_error = _try_post_json(
            f"{_normalize_base_url(TRAINER_URL)}/store",
            {"feature_rows": n2_features},
        )

        should_retrain = drift_score >= RETRAIN_DRIFT_THRESHOLD
        trainer_retrain_result = None
        trainer_retrain_error = None
        if should_retrain:
            trainer_retrain_result, trainer_retrain_error = _try_post_json(
                f"{_normalize_base_url(TRAINER_URL)}/retrain",
                {"mode": trainer_mode, "min_rows": RETRAIN_MIN_ROWS},
            )

        results = {
            "n1": sensor_output,
            "n2": edge_output,
            "n3": actuator_output,
            "n4": {
                "store": trainer_store_result,
                "store_error": trainer_store_error,
                "retrain": trainer_retrain_result,
                "retrain_error": trainer_retrain_error,
                "retrain_triggered": should_retrain,
            },
        }

        n1_readings = sensor_output.get("readings", []) if isinstance(sensor_output, dict) else []
        n1_dropped = sensor_output.get("dropped", []) if isinstance(sensor_output, dict) else []
        n3_predictions = actuator_output.get("predictions", []) if isinstance(actuator_output, dict) else []
        n3_actions = actuator_output.get("actions", []) if isinstance(actuator_output, dict) else []

        poisoned_count = sum(1 for row in n1_readings if isinstance(row, dict) and row.get("_poisoned"))
        anomalous_count = sum(
            1
            for feature in n2_features
            if isinstance(feature, dict)
            and isinstance(feature.get("congestion_score"), (int, float))
            and not (0.0 <= float(feature["congestion_score"]) <= 1.0)
        )

        # Compute clipping / data-quality stats from features
        clipped_count = 0
        total_clip_events = 0
        for f in n2_features:
            if isinstance(f, dict) and f.get("clip_events"):
                clipped = sum(1 for v in f.get("clip_events", {}).values() if v)
                if clipped > 0:
                    clipped_count += 1
                    total_clip_events += clipped

        avg_clip_events = (total_clip_events / clipped_count) if clipped_count > 0 else 0.0

        metrics = {
            "modes": {name: _node_mode(node_modes, name) for name in NODE_ORDER},
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
            "drift_score": drift_score,
            "trainer_store_ok": trainer_store_error is None,
            "trainer_retrain_triggered": should_retrain,
            "trainer_retrain_ok": trainer_retrain_error is None if should_retrain else None,
            "risk_level": "high" if actuator_output.get("halted") or poisoned_count > 0 or anomalous_count > 0 else "normal",
            "summary": (
                f"{len(n1_readings)} readings -> {len(n2_features)} features -> "
                f"{len(n3_predictions)} predictions -> {len(n3_actions)} actions"
            ),
            "latencies_ms": {
                "sensor": round(sensor_latency, 2),
                "edge": round(edge_latency, 2),
                "actuator": round(actuator_latency, 2),
                "total_pipeline_ms": round(total_pipeline_ms, 2),
            },
            "data_quality": {
                "clipped_features": clipped_count,
                "avg_clip_events": round(avg_clip_events, 2),
                "rejection_rate": (len(n1_dropped) / max(len(n1_readings), 1)),
            },
            "throughput": {
                "features_per_second": round(len(n2_features) / max(total_pipeline_ms / 1000.0, 0.001), 2),
            },
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
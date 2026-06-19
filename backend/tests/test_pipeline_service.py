import math

import pytest

from api.routes import pipeline as pipeline_routes
from api.services import pipeline_service


@pytest.mark.parametrize(
    ("scenario_id", "clean_nodes", "expected_modes"),
    [
        (
            1,
            0,
            {
                "sensor": "vulnerable",
                "edge": "vulnerable",
                "actuator": "vulnerable",
                "trainer": "vulnerable",
            },
        ),
        (
            2,
            1,
            {
                "sensor": "clean",
                "edge": "vulnerable",
                "actuator": "vulnerable",
                "trainer": "vulnerable",
            },
        ),
        (
            3,
            2,
            {
                "sensor": "clean",
                "edge": "clean",
                "actuator": "vulnerable",
                "trainer": "vulnerable",
            },
        ),
        (
            4,
            3,
            {
                "sensor": "clean",
                "edge": "clean",
                "actuator": "clean",
                "trainer": "vulnerable",
            },
        ),
        (
            5,
            4,
            {
                "sensor": "clean",
                "edge": "clean",
                "actuator": "clean",
                "trainer": "clean",
            },
        ),
    ],
)
def test_progressive_scenarios_build_expected_node_modes(
    monkeypatch, scenario_id, clean_nodes, expected_modes
):
    calls = []

    def fake_run_scenario(*, scenario_id, node_modes, n_readings):
        calls.append(
            {
                "scenario_id": scenario_id,
                "node_modes": node_modes,
                "n_readings": n_readings,
            }
        )
        return {"status": "success"}

    monkeypatch.setattr(pipeline_routes, "run_scenario", fake_run_scenario)

    result = pipeline_routes._run_progressive_scenario(
        scenario_id=scenario_id, clean_nodes=clean_nodes
    )

    assert result == {"status": "success"}
    assert calls == [
        {
            "scenario_id": scenario_id,
            "node_modes": expected_modes,
            "n_readings": 10,
        }
    ]


def test_run_scenario_calculates_summary_metrics_and_retraining(monkeypatch):
    calls = []

    def fake_post_json(url, payload, **kwargs):
        calls.append((url, payload))

        if url.endswith("/run"):
            return {
                "readings": [
                    {"id": 1, "speed": 45},
                    {"id": 2, "speed": 999, "_poisoned": True},
                    {"id": 3, "speed": 35},
                ],
                "dropped": [{"id": 99, "reason": "invalid"}],
            }

        if url.endswith("/process"):
            return {
                "features": [
                    {"congestion_score": 0.4, "clip_events": {"speed": True}},
                    {"congestion_score": 1.4, "clip_events": {"flow": False}},
                    {
                        "congestion_score": -0.2,
                        "clip_events": {"speed": True, "density": True},
                    },
                ]
            }

        if url.endswith("/infer"):
            return {
                "predictions": [{"state": "slow"}, {"state": "gridlock"}],
                "actions": [{"action": "reroute"}],
                "aggregate": {
                    "dominant_state": "gridlock",
                    "avg_congestion_score": 0.91,
                },
                "integrity_ok": False,
                "halted": False,
                "retraining_feedback": {"estimated_drift": 0.5},
            }

        if url.endswith("/store"):
            return {"stored_rows": len(payload["feature_rows"])}

        if url.endswith("/retrain"):
            return {"model_version": "v2"}

        raise AssertionError(f"unexpected URL: {url}")

    monkeypatch.setattr(pipeline_service, "_post_json", fake_post_json)
    monkeypatch.setattr(pipeline_service, "RETRAIN_DRIFT_THRESHOLD", 0.25)
    monkeypatch.setattr(pipeline_service, "RETRAIN_MIN_ROWS", 50)

    result = pipeline_service.run_scenario(
        scenario_id=3,
        node_modes={
            "sensor": "clean",
            "edge": "clean",
            "actuator": "vulnerable",
            "trainer": "clean",
        },
        n_readings=3,
    )

    metrics = result["metrics"]

    assert result["scenario"] == 3
    assert result["status"] == "success"
    assert metrics["modes"] == {
        "sensor": "clean",
        "edge": "clean",
        "actuator": "vulnerable",
        "trainer": "clean",
    }
    assert metrics["readings_received"] == 3
    assert metrics["readings_dropped"] == 1
    assert metrics["poisoned_readings"] == 1
    assert metrics["features_generated"] == 3
    assert metrics["anomalous_features"] == 2
    assert metrics["predictions_generated"] == 2
    assert metrics["actions_generated"] == 1
    assert metrics["dominant_state"] == "gridlock"
    assert metrics["avg_congestion_score"] == 0.91
    assert metrics["integrity_ok"] is False
    assert metrics["risk_level"] == "high"
    assert metrics["summary"] == "3 readings -> 3 features -> 2 predictions -> 1 actions"
    assert metrics["trainer_store_ok"] is True
    assert metrics["trainer_retrain_triggered"] is True
    assert metrics["trainer_retrain_ok"] is True
    assert metrics["drift_score"] == 0.5
    assert metrics["data_quality"]["clipped_features"] == 2
    assert metrics["data_quality"]["avg_clip_events"] == 1.5
    assert metrics["data_quality"]["rejection_rate"] == pytest.approx(1 / 3)
    assert result["data"]["n4"]["store"] == {"stored_rows": 3}
    assert result["data"]["n4"]["retrain"] == {"model_version": "v2"}
    assert any(url.endswith("/store") for url, _ in calls)
    assert any(url.endswith("/retrain") for url, _ in calls)


def test_json_safe_replaces_non_finite_numbers():
    payload = {
        "nan": math.nan,
        "positive_inf": math.inf,
        "nested": [{"negative_inf": -math.inf, "finite": 0.75}],
    }

    assert pipeline_service._json_safe(payload) == {
        "nan": None,
        "positive_inf": None,
        "nested": [{"negative_inf": None, "finite": 0.75}],
    }

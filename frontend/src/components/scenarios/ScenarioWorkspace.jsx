import { useState, useEffect, useMemo } from "react";
import { request } from "../../services/apiClient";
import ScenarioMetricsPanel from "./ScenarioMetricsPanel";
import PipelineCanvas from "../pipeline/PipelineCanvas";
import WelcomePage from "./WelcomePage";

// --- SCENARIO 1: PIPELINE INVESTIGATION ---
function PhaseNode({ phase, isActive, onClick }) {
  const statusClass = `scenario-phase--${phase.status}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`scenario-phase ${statusClass} ${isActive ? "is-active" : ""}`}
    >
      <div className="scenario-phase__topline">
        <span className="scenario-phase__code">{phase.code}</span>
        <span className="scenario-phase__status">{phase.status}</span>
      </div>
      <div className="scenario-phase__name">{phase.name}</div>
      <div className="scenario-phase__summary">{phase.summary}</div>
    </button>
  );
}

function CodeBlock({ value, color = "var(--text-2)" }) {
  return (
    <pre className="scenario-code-block" style={{ color }}>
      {value}
    </pre>
  );
}

function LogBlock({ value, title = "PIPELINE LOGS" }) {
  const lines = value ? value.split("\n") : [];

  if (!lines.length) {
    return (
      <div className="scenario-empty-state">
        No logs available for this node yet.
      </div>
    );
  }

  return (
    <div className="scenario-log-block">
      <div className="scenario-log-block__header">{title}</div>

      <div className="scenario-log-block__body">
        {lines.map((line, index) => {
          const isError =
            line.includes("ERROR") ||
            line.includes("FAILED") ||
            line.includes("VULNERABLE");

          const isWarning =
            line.includes("WARNING") ||
            line.includes("ANOMALY") ||
            line.includes("DRIFT");

          return (
            <div
              key={`${line}-${index}`}
              className={`scenario-log-line ${
                isError ? "is-error" : isWarning ? "is-warning" : ""
              }`}
            >
              <span className="scenario-log-line__number">
                {String(index + 1).padStart(3, "0")}
              </span>
              <span className="scenario-log-line__text">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildPipelineLogsForPhase(phaseId, pipelineResult, driftScore = 0) {
  const data = pipelineResult?.data || {};
  const n1 = data.n1 || {};
  const n2 = data.n2 || {};
  const n3 = data.n3 || {};
  const n4 = data.n4 || {};

  if (phaseId === "edge") {
    return Array.isArray(n1.log)
      ? n1.log.map((line) => `[NODE-1] ${line}`)
      : [];
  }

  if (phaseId === "preprocessing") {
    return Array.isArray(n2.log)
      ? n2.log.map((line) => `[NODE-2] ${line}`)
      : [];
  }

  if (phaseId === "actuator") {
    return Array.isArray(n3.log)
      ? n3.log.map((line) => `[NODE-3] ${line}`)
      : [];
  }

  if (phaseId === "trainer") {
    const logs = [];
    if (n4.store_error) logs.push(`[NODE-4] Store failed: ${n4.store_error}`);
    if (n4.store)
      logs.push("[NODE-4] Feature rows stored for training review.");
    if (n4.retrain_error)
      logs.push(`[NODE-4] Retrain failed: ${n4.retrain_error}`);
    if (Array.isArray(n4.retrain?.log)) {
      logs.push(...n4.retrain.log.map((line) => `[NODE-4] ${line}`));
    } else if (n4.retrain_triggered) {
      logs.push(
        `[NODE-4] Retraining triggered. drift=${Number(driftScore).toFixed(3)}`,
      );
    } else {
      logs.push(
        `[NODE-4] Retraining not triggered. drift=${Number(driftScore).toFixed(3)}`,
      );
    }
    return logs;
  }

  return [];
}

export function ScenarioOnePipelineRuntime() {
  const fallbackPhases = useMemo(
    () => [
      {
        id: "edge",
        code: "NODE-1",
        name: "Sensor Data Node",
        status: "compromised",
        summary: "Accepted a physically impossible sensor reading.",
        receives:
          '{\n  "sensor_id": "cam_north_01",\n  "timestamp": "08:14:58",\n  "traffic_volume": -5000,\n  "avg_speed": 0,\n  "source": "telemetry_csv",\n  "signed": false\n}',
        emits:
          '{\n  "forwarded_reading": {\n    "sensor_id": "cam_north_01",\n    "traffic_volume": -5000,\n    "_poisoned": true\n  },\n  "dropped": 0\n}',
        checks: [
          {
            id: "range-validation",
            label: "Validate Physical Range",
            finding:
              "The node forwarded traffic_volume = -5000 instead of rejecting it.",
          },
          {
            id: "sensor-identity",
            label: "Verify Sensor Identity",
            finding: "Unsigned telemetry was accepted as trusted sensor data.",
          },
        ],
      },
      {
        id: "preprocessing",
        code: "NODE-2",
        name: "Edge Pre-processing Node",
        status: "warning",
        summary: "Converted the poisoned reading into an invalid feature.",
        receives:
          '{\n  "input_readings": [\n    {\n      "sensor_id": "cam_north_01",\n      "traffic_volume": -5000\n    }\n  ]\n}',
        emits:
          '{\n  "features": [\n    {\n      "sensor_id": "cam_north_01",\n      "congestion_score": -0.625,\n      "anomaly": true\n    }\n  ],\n  "skipped": 0\n}',
        checks: [
          {
            id: "feature-range",
            label: "Validate Feature Ranges",
            finding:
              "congestion_score = -0.625 was flagged as anomalous but still forwarded.",
          },
        ],
      },
      {
        id: "actuator",
        code: "NODE-3",
        name: "Inference & Action Node",
        status: "warning",
        summary: "Turned the invalid feature into a traffic-control action.",
        receives:
          '{\n  "model_version": "v2.1",\n  "features": [\n    {\n      "congestion_score": -0.625,\n      "anomaly": true\n    }\n  ]\n}',
        emits:
          '{\n  "prediction": "NO_TRAFFIC",\n  "action": "SET_NORTH_AVENUE_RED",\n  "guardrail_blocked": false\n}',
        checks: [
          {
            id: "action-safety",
            label: "Review Action Output",
            finding:
              "The action was allowed even though the input feature was already anomalous.",
          },
        ],
      },
      {
        id: "trainer",
        code: "NODE-4",
        name: "Trainer Node",
        status: "warning",
        summary: "Stored the poisoned feature and evaluated retraining risk.",
        receives:
          '{\n  "stored_features": [\n    {\n      "sensor_id": "cam_north_01",\n      "congestion_score": -0.625\n    }\n  ],\n  "trigger_drift": 0.279\n}',
        emits:
          '{\n  "store": "ok",\n  "retrain_triggered": true,\n  "drift_score": 0.279\n}',
        checks: [
          {
            id: "drift-monitor",
            label: "Audit Drift Monitoring",
            finding:
              "Drift is high enough to require quarantine or human review before retraining.",
          },
        ],
      },
    ],
    [],
  );

  const [activePhaseId, setActivePhaseId] = useState("edge");
  const [activeTab, setActiveTab] = useState("received");
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState("");
  const [pipelineResult, setPipelineResult] = useState(null);

  const pipelineMetrics = pipelineResult?.metrics || {
    readings_received: 0,
    readings_dropped: 0,
    poisoned_readings: 0,
    features_generated: 0,
    anomalous_features: 0,
    predictions_generated: 0,
    actions_generated: 0,
    dominant_state: "unknown",
    avg_congestion_score: 0,
    integrity_ok: null,
    halted: false,
    drift_score: 0,
    risk_level: "normal",
    summary: "Waiting for backend pipeline data.",
  };

  async function runBackendPipeline() {
    setPipelineLoading(true);
    setPipelineError("");

    try {
      const payload = await request("/api/scenarios/1/run", {
        cache: "no-store",
      });
      setPipelineResult(payload || null);
    } catch (error) {
      setPipelineError(error?.message || "Failed to run scenario pipeline.");
      setPipelineResult(null);
    } finally {
      setPipelineLoading(false);
    }
  }

  useEffect(() => {
    runBackendPipeline();
  }, []);

  const phases = useMemo(() => {
    if (!pipelineResult?.data) return fallbackPhases;

    const n1 = pipelineResult.data.n1 || {};
    const n2 = pipelineResult.data.n2 || {};
    const n3 = pipelineResult.data.n3 || {};
    const n4 = pipelineResult.data.n4 || {};

    const n1Poisoned = Array.isArray(n1.readings)
      ? n1.readings.some((r) => r && r._poisoned)
      : false;
    const n2Anomalous = Array.isArray(n2.features)
      ? n2.features.some(
          (f) =>
            typeof f?.congestion_score === "number" &&
            (f.congestion_score < 0 || f.congestion_score > 1),
        )
      : false;
    const n3IntegrityOk = n3.integrity_ok === true;

    return [
      {
        id: "edge",
        code: "NODE-1",
        name: "Sensor Data Node",
        status: n1Poisoned ? "compromised" : "healthy",
        summary: `Forwarded ${n1.readings?.length || 0} readings. Dropped ${n1.dropped?.length || 0}.`,
        receives: JSON.stringify(
          { mode: n1.mode, n_readings: n1.readings?.length || 0 },
          null,
          2,
        ),
        emits: JSON.stringify(
          {
            sample_reading: (n1.readings || [])[0] || null,
            dropped: n1.dropped?.length || 0,
          },
          null,
          2,
        ),
        checks: [
          {
            id: "poison-check",
            label: "Detect Poisoned Sensor Frames",
            finding: n1Poisoned
              ? "Poisoned readings were detected in the batch."
              : "No poisoned readings detected.",
          },
        ],
      },
      {
        id: "preprocessing",
        code: "NODE-2",
        name: "Edge Pre-processing Node",
        status: n2Anomalous ? "warning" : "healthy",
        summary: `Generated ${n2.features?.length || 0} features. Skipped ${n2.skipped?.length || 0}.`,
        receives: JSON.stringify(
          {
            input_readings: n1.readings?.length || 0,
            sample_input: (n1.readings || [])[0] || null,
          },
          null,
          2,
        ),
        emits: JSON.stringify(
          {
            sample_feature: (n2.features || [])[0] || null,
            anomalous_scores: n2Anomalous,
          },
          null,
          2,
        ),
        checks: [
          {
            id: "feature-range",
            label: "Validate Feature Ranges",
            finding: n2Anomalous
              ? "Out-of-range congestion features detected."
              : "Feature ranges look valid.",
          },
        ],
      },
      {
        id: "actuator",
        code: "NODE-3",
        name: "Actuator Node",
        status: n3IntegrityOk ? "healthy" : "warning",
        summary: `Predictions: ${n3.predictions?.length || 0}. Actions: ${n3.actions?.length || 0}.`,
        receives: JSON.stringify(
          {
            input_features: n2.features?.length || 0,
            sample_feature: (n2.features || [])[0] || null,
          },
          null,
          2,
        ),
        emits: JSON.stringify(
          {
            model_version: n3.model_version || "unknown",
            integrity_ok: n3.integrity_ok,
            aggregate: n3.aggregate || {},
            retraining_feedback: n3.retraining_feedback || {},
          },
          null,
          2,
        ),
        checks: [
          {
            id: "model-integrity",
            label: "Verify Model Integrity",
            finding: n3IntegrityOk
              ? "Model integrity check passed and actions were generated."
              : "Inference or integrity check failed.",
          },
          {
            id: "action-safety",
            label: "Review Action Output",
            finding: n3.halted
              ? "Actions halted by safety guardrails."
              : "Actions executed and returned to the physical node.",
          },
        ],
      },
      {
        id: "trainer",
        code: "NODE-4",
        name: "Trainer Node",
        status: n4.retrain_triggered ? "warning" : "healthy",
        summary: n4.retrain_triggered
          ? `Store: ${n4.store ? "ok" : "failed"}. Retrain: ${n4.retrain ? "triggered" : "failed"}.`
          : `Store: ${n4.store ? "ok" : "failed"}. Retrain not triggered.`,
        receives: JSON.stringify(
          {
            stored_features: n2.features?.length || 0,
            trigger_drift: pipelineMetrics.drift_score,
          },
          null,
          2,
        ),
        emits: JSON.stringify(
          {
            store: n4.store || null,
            retrain: n4.retrain || null,
            retrain_triggered: n4.retrain_triggered || false,
          },
          null,
          2,
        ),
        checks: [
          {
            id: "decision-safety",
            label: "Verify Training Activity",
            finding: n4.retrain_triggered
              ? "Trainer received features and retraining was triggered."
              : "Features were stored, retraining was not needed.",
          },
          {
            id: "dataset-store",
            label: "Check Training DB",
            finding: n4.store_error
              ? `Store error: ${n4.store_error}`
              : "Training data stored successfully.",
          },
        ],
      },
    ];
  }, [pipelineResult, fallbackPhases, pipelineMetrics.drift_score]);

  useEffect(() => {
    if (!phases.some((phase) => phase.id === activePhaseId)) {
      setActivePhaseId(phases[0]?.id || "edge");
    }
  }, [phases, activePhaseId]);

  const activePhase =
    phases.find((phase) => phase.id === activePhaseId) || phases[0];
  const compromisedCount = phases.filter(
    (phase) => phase.status === "compromised" || phase.status === "warning",
  ).length;

  const activeNodeLogsText = useMemo(() => {
    const lines = buildPipelineLogsForPhase(
      activePhase?.id,
      pipelineResult,
      pipelineMetrics.drift_score,
    );
    if (lines.length > 0) return lines.join("\n");
    if (pipelineLoading) return "Loading pipeline logs...";
    return "No pipeline logs available for this node yet.";
  }, [
    activePhase?.id,
    pipelineLoading,
    pipelineMetrics.drift_score,
    pipelineResult,
  ]);

  return (
    <section className="scenario-workspace">
      <div className="scenario-header">
        <div className="scenario-header__main">
          <div className="scenario-eyebrow scenario-eyebrow--blue">
            Scenario 1 / Distributed AI Pipeline Investigation
          </div>
          <div className="scenario-title">Trace the Data Poisoning Attack</div>
          <p className="scenario-subtitle">
            Follow the same record through each node, then decide where the
            security control should have stopped it.
          </p>
        </div>
      </div>

      <div className="scenario-unified-window">
        <div className="scenario-window-topbar">
          <div className="scenario-window-toolbar">
            <span className="scenario-window-risk">
              {compromisedCount} nodes need attention
            </span>
            <button
              type="button"
              onClick={runBackendPipeline}
              disabled={pipelineLoading}
              className="scenario-refresh-button"
            >
              {pipelineLoading ? "Running..." : "Refresh Pipeline"}
            </button>
          </div>
        </div>

        <div className="scenario-window-main">
          <PipelineCanvas
            phases={phases}
            activeNodeId={activePhase?.id}
            onNodeClick={(id) => setActivePhaseId(id)}
          />
          <div className="scenario-window-status-row">
            <span className="scenario-run-state">
              {pipelineResult
                ? "Live backend data loaded."
                : pipelineError
                  ? "Fallback: showing mockup data."
                  : "Loading live backend data..."}
            </span>
            {pipelineError ? (
              <span className="scenario-run-state scenario-run-state--error">
                {pipelineError}
              </span>
            ) : null}
          </div>

          <div className="scenario-metrics-band scenario-metrics-band--inside">
            <ScenarioMetricsPanel metrics={pipelineMetrics} />
          </div>

          <div className="scenario-connected-card__body">
            <div className="scenario-tabs" role="tablist">
              {["received", "emitted", "logs"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`scenario-tab ${activeTab === tab ? "is-active" : ""}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="scenario-window-content">
              <div className="scenario-detail-panel__body">
                {activeTab === "received" && (
                  <CodeBlock color="var(--blue)" value={activePhase.receives} />
                )}

                {activeTab === "emitted" && (
                  <CodeBlock color="var(--orange)" value={activePhase.emits} />
                )}

                {activeTab === "logs" && (
                  <LogBlock value={activeNodeLogsText} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// MAIN EXPORT
export default function ScenarioWorkspace({
  item,
  onCompleteScenario,
  onSelectItem,
}) {
  if (item.id === "scenario-0")
    return (
      <WelcomePage
        item={item}
        onComplete={onCompleteScenario}
        onSelectItem={onSelectItem}
      />
    );
  if (item.id === "scenario-1") return <ScenarioOnePipelineRuntime />;

  return (
    <div style={{ padding: "20px", color: "var(--text-3)" }}>
      Select a scenario to begin investigation.
    </div>
  );
}

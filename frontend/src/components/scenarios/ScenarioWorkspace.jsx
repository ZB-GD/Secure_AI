import { useState, useEffect, useMemo } from "react";
import { request } from "../../services/apiClient";
import PipelineCanvas from "./PipelineCanvas";
import WelcomePage from "./WelcomePage";

// --- ACADEMIC THEORETICAL FOUNDATIONS ---
const THEORETICAL_BASES = {
  "scenario-0": {
    topic: "Cyber-Physical Systems (CPS)",
    concept: "CPS integrate digital AI processing with physical infrastructure. A logical failure or cyber attack in the AI pipeline directly causes physical world consequences, such as traffic gridlocks.",
    reference: "NIST SP 800-82",
    link: "/docs" // <-- RUTA A TU PESTAÑA DE DOC
  },
  "scenario-1": {
    topic: "Data Poisoning Attacks",
    concept: "The injection of malicious or physically impossible data into the ingestion pipeline. If unvalidated, the AI model learns or predicts based on corrupted reality, bypassing traditional firewalls.",
    reference: "OWASP ML02:2023",
    link: "/docs" // <-- RUTA A TU PESTAÑA DE DOC
  },
  "default": {
    topic: "AI Pipeline Security",
    concept: "AI systems must implement defense-in-depth across the entire pipeline: from data ingestion and input handling, to model training and output serving.",
    reference: "MITRE ATLAS",
    link: "/docs" // <-- RUTA A TU PESTAÑA DE DOC
  }
};

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

const NODE_CONTEXT = {
  edge: {
    receives:
      "Raw IoT frame from a street sensor, before any validation. traffic_volume is the vehicle count at the sensor; values below 0 are physically impossible. signed: false means the frame carries no device authentication.",
    emits:
      "The reading NODE-1 forwarded downstream. A _poisoned: true flag means a bad reading passed the entry point unchecked and is now travelling through the full pipeline.",
  },
  preprocessing: {
    receives:
      "The sensor readings forwarded by NODE-1, including any poisoned ones. NODE-2 sees these raw values and must decide whether to clean, quarantine, or pass them through.",
    emits:
      "The computed feature vector. The key field is congestion_score = traffic_volume / 8000. With traffic_volume = -5000 this becomes -0.625, a negative congestion score that is physically impossible and indicates the poisoned input is now a model feature.",
  },
  actuator: {
    receives:
      "The feature vector from NODE-2 that the model will run inference on. integrity_ok shows whether the model weights passed a hash check; null or false means the model cannot be trusted.",
    emits:
      "The model's prediction and the physical action dispatched to city infrastructure. model_version identifies which weights were used; retraining_feedback is sent back to NODE-4 to update the drift calculation.",
  },
  trainer: {
    receives:
      "Feature rows staged for storage and the current drift score. trigger_drift above the threshold means retraining is being considered, even if the features themselves are poisoned.",
    emits:
      "Whether features were stored (store) and if retraining was triggered (retrain_triggered). If poisoned features were stored and retraining ran, the model's future predictions will be based on corrupted data.",
  },
};

function PipelineRuntime({ compact = false }) {
  const fallbackPhases = useMemo(
    () => [
      {
        id: "edge",
        code: "NODE-1",
        name: "Sensor Data Node",
        status: "compromised",
        summary: "Accepted a physically impossible sensor reading.",
        statusReason: "Entry point accepted poisoned telemetry.",
        about:
          "NODE-1 is the entry point for all sensor data in CityFlow AI. It ingests raw traffic readings from IoT devices (vehicle counts, speeds, and weather conditions) and forwards them downstream. As the first trust boundary it must reject physically impossible values (e.g. traffic_volume < 0) and verify that frames come from authenticated sensors. In this scenario it skips all validation and accepts every reading, including the poisoned traffic_volume = -5000.",
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
        status: "compromised",
        summary: "Converted the poisoned reading into an invalid feature.",
        statusReason: "Anomalous feature forwarded downstream without quarantine.",
        about:
          "NODE-2 transforms raw sensor readings into the feature vector the ML model expects. Its key computation is congestion_score = traffic_volume / 8000. When traffic_volume = -5000 arrives, the result is congestion_score = -0.625, a physically impossible value. The node flags it as anomalous but still forwards it instead of quarantining it, so the poisoned feature reaches inference unchanged.",
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
        status: "compromised",
        summary: "Turned the invalid feature into a traffic-control action.",
        statusReason: "Model integrity check skipped; actions generated from poisoned input.",
        about:
          "NODE-3 runs ML inference on the feature vector from NODE-2 and translates the prediction into a real-world action, such as holding a traffic light red or rerouting vehicles. Because its output directly controls physical infrastructure, it must verify model integrity and refuse to act on anomalous input. In vulnerable mode it generates actions even when the input feature was already flagged as anomalous.",
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
        status: "compromised",
        summary: "Stored the poisoned feature and evaluated retraining risk.",
        statusReason: "Retraining risk exists because poisoned features reached storage.",
        about:
          "NODE-4 persists incoming feature rows to the training database and monitors data drift. If the drift score crosses a threshold, it triggers model retraining, permanently incorporating the poisoned features into the model's future behavior. The critical defense here is halting retraining when drift is elevated and quarantining suspicious features before they corrupt the next model version.",
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
  const [activeTab, setActiveTab] = useState("about");
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState("");
  const [pipelineResult, setPipelineResult] = useState(null);

  const drift_score = pipelineResult?.metrics?.drift_score ?? 0;

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
    const n3Status =
      n3.integrity_ok === false || n3.halted || n3.integrity_ok === null || n3.integrity_ok === undefined
        ? "compromised"
        : "healthy";
    const n4Status =
      n4.store_error || n4.retrain_error || n4.retrain_triggered
        ? "compromised"
        : "healthy";

    return [
      {
        id: "edge",
        code: "NODE-1",
        name: "Sensor Data Node",
        status: n1Poisoned ? "compromised" : "healthy",
        summary: `Forwarded ${n1.readings?.length || 0} readings. Dropped ${n1.dropped?.length || 0}.`,
        statusReason: n1Poisoned
          ? "Entry point accepted poisoned telemetry."
          : "Sensor readings passed ingestion checks.",
        about:
          "NODE-1 is the entry point for all sensor data in CityFlow AI. It ingests raw traffic readings from IoT devices (vehicle counts, speeds, and weather conditions) and forwards them downstream. As the first trust boundary it must reject physically impossible values (e.g. traffic_volume < 0) and verify that frames come from authenticated sensors. In this scenario it skips all validation and accepts every reading, including the poisoned traffic_volume = -5000.",
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
        status: n2Anomalous ? "compromised" : "healthy",
        summary: `Generated ${n2.features?.length || 0} features. Skipped ${n2.skipped?.length || 0}.`,
        statusReason: n2Anomalous
          ? "Poisoned data produced an anomalous feature."
          : "Generated features are within expected ranges.",
        about:
          "NODE-2 transforms raw sensor readings into the feature vector the ML model expects. Its key computation is congestion_score = traffic_volume / 8000. When traffic_volume = -5000 arrives, the result is congestion_score = -0.625, a physically impossible value. The node flags it as anomalous but still forwards it instead of quarantining it, so the poisoned feature reaches inference unchanged.",
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
        status: n3Status,
        summary: `Predictions: ${n3.predictions?.length || 0}. Actions: ${n3.actions?.length || 0}.`,
        statusReason:
          n3.integrity_ok === false
            ? "Model integrity check failed."
            : n3.halted
              ? "Action guardrails halted downstream decisions."
              : n3.integrity_ok === null || n3.integrity_ok === undefined
                ? "Model integrity verification was skipped in vulnerable mode."
                : "Model integrity verified and decisions completed.",
        about:
          "NODE-3 runs ML inference on the feature vector from NODE-2 and translates the prediction into a real-world action, such as holding a traffic light red or rerouting vehicles. Because its output directly controls physical infrastructure, it must verify model integrity and refuse to act on anomalous input. In vulnerable mode it generates actions even when the input feature was already flagged as anomalous.",
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
        status: n4Status,
        summary: n4.retrain_triggered
          ? `Store: ${n4.store ? "ok" : "failed"}. Retrain: ${n4.retrain ? "triggered" : "failed"}.`
          : `Store: ${n4.store ? "ok" : "failed"}. Retrain not triggered.`,
        statusReason:
          n4.store_error || n4.retrain_error
            ? "Training store or retraining failed."
            : n4.retrain_triggered
              ? "Drift threshold triggered retraining review."
              : "Stored features did not cross retraining threshold.",
        about:
          "NODE-4 persists incoming feature rows to the training database and monitors data drift. If the drift score crosses a threshold, it triggers model retraining, permanently incorporating the poisoned features into the model's future behavior. The critical defense here is halting retraining when drift is elevated and quarantining suspicious features before they corrupt the next model version.",
        receives: JSON.stringify(
          {
            stored_features: n2.features?.length || 0,
            trigger_drift: drift_score,
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
  }, [pipelineResult, fallbackPhases, drift_score]);

  useEffect(() => {
    if (!phases.some((phase) => phase.id === activePhaseId)) {
      setActivePhaseId(phases[0]?.id || "edge");
    }
  }, [phases, activePhaseId]);

  const activePhase =
    phases.find((phase) => phase.id === activePhaseId) || phases[0];

  const activeNodeLogsText = useMemo(() => {
    const lines = buildPipelineLogsForPhase(
      activePhase?.id,
      pipelineResult,
      drift_score,
    );
    if (lines.length > 0) return lines.join("\n");
    if (pipelineLoading) return "Loading pipeline logs...";
    return "No pipeline logs available for this node yet.";
  }, [
    activePhase?.id,
    pipelineLoading,
    drift_score,
    pipelineResult,
  ]);

  return (
    <section className="scenario-workspace">
      <div className="scenario-unified-window">
        {!compact && (
          <div className="scenario-window-header">
            <div className="scenario-eyebrow scenario-eyebrow--blue">
              CityFlow AI / Distributed Pipeline
            </div>
            <div className="scenario-title">General Pipeline View</div>
            <p className="scenario-subtitle">
              Inspect what each node receives, emits, and logs as telemetry moves through the AI traffic-control system.
            </p>
          </div>
        )}

        <div className="scenario-window-main">
          {pipelineError && (
            <div className="scenario-window-error" role="alert">
              {pipelineError}
            </div>
          )}
          <PipelineCanvas
            phases={phases}
            activeNodeId={activePhase?.id}
            onNodeClick={(id) => setActivePhaseId(id)}
          />

          <div className="scenario-connected-card__body">
            <div className="scenario-tabs" role="tablist">
              {["about", "received", "emitted", "logs"].map((tab) => (
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-3)", lineHeight: 1.65 }}>
                      {NODE_CONTEXT[activePhase?.id]?.receives}
                    </p>
                    <CodeBlock color="var(--blue)" value={activePhase.receives} />
                  </div>
                )}

                {activeTab === "about" && (
                  <div
                    style={{
                      color: "var(--text-2)",
                      fontSize: "14px",
                      lineHeight: 1.65,
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-1)",
                        fontFamily: "var(--font-display)",
                        fontSize: "16px",
                        marginBottom: "8px",
                      }}
                    >
                      {activePhase.code} · {activePhase.name}
                    </div>
                    {activePhase.about}
                  </div>
                )}

                {activeTab === "emitted" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-3)", lineHeight: 1.65 }}>
                      {NODE_CONTEXT[activePhase?.id]?.emits}
                    </p>
                    <CodeBlock color="var(--orange)" value={activePhase.emits} />
                  </div>
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

export default function ScenarioWorkspace({
  item,
  onCompleteScenario,
  onSelectItem,
  compact = false,
}) {
  if (item.id === "scenario-0")
    return (
      <WelcomePage
        item={item}
        onComplete={onCompleteScenario}
        onSelectItem={onSelectItem}
      />
    );
  if (item.id === "scenario-1") return <PipelineRuntime compact={compact} />;

  return (
    <div style={{ padding: "20px", color: "var(--text-3)" }}>
      Select a scenario to begin investigation.
    </div>
  );
}

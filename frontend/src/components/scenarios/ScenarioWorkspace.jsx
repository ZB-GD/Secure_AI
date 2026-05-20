import { useState, useEffect, useMemo } from "react";
import { request } from "../../services/apiClient";
import PipelineCanvas from "./PipelineCanvas";
import WelcomePage from "./WelcomePage";

function Hi({ children }) {
  return (
    <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{children}</span>
  );
}

function FieldList({ fields }) {
  return (
    <dl
      style={{
        margin: "8px 0 0",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      }}
    >
      {fields.map(([key, desc]) => (
        <div
          key={key}
          style={{ display: "flex", gap: "10px", alignItems: "baseline" }}
        >
          <dt
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--blue)",
              fontWeight: 600,
            }}
          >
            {key}
          </dt>
          <dd
            style={{
              margin: 0,
              fontSize: "14px",
              color: "var(--text-2)",
              lineHeight: 1.6,
            }}
          >
            {desc}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// --- ACADEMIC THEORETICAL FOUNDATIONS ---
const THEORETICAL_BASES = {
  "scenario-0": {
    topic: "Cyber-Physical Systems (CPS)",
    concept:
      "CPS integrate digital AI processing with physical infrastructure. A logical failure or cyber attack in the AI pipeline directly causes physical world consequences, such as traffic gridlocks.",
    reference: "NIST SP 800-82",
    link: "/docs", // <-- RUTA A TU PESTAÑA DE DOC
  },
  "scenario-1": {
    topic: "Data Poisoning Attacks",
    concept:
      "The injection of malicious or physically impossible data into the ingestion pipeline. If unvalidated, the AI model learns or predicts based on corrupted reality, bypassing traditional firewalls.",
    reference: "OWASP ML02:2023",
    link: "/docs", // <-- RUTA A TU PESTAÑA DE DOC
  },
  default: {
    topic: "AI Pipeline Security",
    concept:
      "AI systems must implement defense-in-depth across the entire pipeline: from data ingestion and input handling, to model training and output serving.",
    reference: "MITRE ATLAS",
    link: "/docs", // <-- RUTA A TU PESTAÑA DE DOC
  },
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

function CodeBlock({ value, color = "var(--text-2)", fill = false }) {
  return (
    <pre
      className="scenario-code-block"
      style={{ color, ...(fill && { height: "100%", boxSizing: "border-box", margin: 0 }) }}
    >
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
    receives: <>Raw sensor frame from a street camera, before any checks. The key field is <Hi>traffic_volume</Hi> — a vehicle count that must be zero or above to be realistic. <Hi>signed: false</Hi> means the sensor did not prove its identity before sending data.</>,
    receivesFields: [
      ["sensor_id",       "unique ID of the camera or counter that sent this frame (e.g. cam_north_01)"],
      ["timestamp",       "time the reading was recorded at the sensor"],
      ["traffic_volume",  <>vehicle count — must be <Hi>≥ 0</Hi>; this is the field the attack manipulates</>],
      ["avg_speed",       "average vehicle speed in km/h at the time of the reading"],
      ["signed",          <><Hi>false</Hi> — no cryptographic proof the frame came from a real, registered device</>],
      ["source",          <><Hi>telemetry_csv</Hi> — data replayed from a file, not sent live by a physical sensor</>],
    ],
    emits: <>The reading NODE-1 passed downstream. <Hi>_poisoned: true</Hi> means an impossible value made it through the entry point unchecked and is now inside the pipeline.</>,
    emitsFields: [
      ["forwarded_reading", "the original sensor frame, passed to NODE-2 as-is"],
      ["_poisoned",         <><Hi>true</Hi> — reading failed a range check but was forwarded anyway; this flag tracks the attack through the pipeline</>],
      ["dropped",           <>count of readings NODE-1 rejected — <Hi>0</Hi> in vulnerable mode because no validation runs</>],
    ],
    logs: <>Each line shows what NODE-1 accepted or dropped. Look for <Hi>_poisoned</Hi> readings — if one appears, an invalid sensor frame entered the pipeline without any challenge.</>,
  },
  preprocessing: {
    receives: <>The sensor reading forwarded by NODE-1. NODE-2 must decide: is this value realistic enough to compute features from, or should it be <Hi>quarantined</Hi>? In vulnerable mode nothing is quarantined.</>,
    receivesFields: [
      ["input_readings", "array of sensor frames from NODE-1; may include readings with impossible traffic_volume values"],
    ],
    emits: <>The <Hi>feature vector</Hi> the model will use. The key output is <Hi>congestion_score</Hi>. A negative value means a poisoned input made it to this stage and is now dressed up as a valid model feature.</>,
    emitsFields: [
      ["congestion_score", <><Hi>traffic_volume / 8,000</Hi> — a 0-to-1 scale of road busyness; negative means the attack reached feature engineering</>],
      ["anomaly",          <><Hi>true</Hi> when congestion_score falls outside [0, 1]; node detected the problem but still forwarded it in vulnerable mode</>],
      ["skipped",          <>count of readings discarded before computing features — <Hi>0</Hi> in vulnerable mode</>],
    ],
    logs: <>Shows the feature values NODE-2 computed. Look for <Hi>anomaly: true</Hi> or a <Hi>negative congestion_score</Hi> — either confirms a poisoned reading is being treated as valid data.</>,
  },
  actuator: {
    receives: <>The feature vector from NODE-2 that will be fed into the ML model. <Hi>integrity_ok</Hi> is the result of a model hash check — if it is <Hi>null or false</Hi>, the model weights may have been modified and cannot be trusted.</>,
    receivesFields: [
      ["model_version", "version of the trained model running inference (e.g. v2.1)"],
      ["features",      "feature vector from NODE-2; congestion_score is the primary input the model reads"],
      ["integrity_ok",  <><Hi>null</Hi> in vulnerable mode — model file hash was never checked; model could have been tampered with</>],
    ],
    emits: <>The model's prediction translated into a physical traffic control command. <Hi>guardrail_blocked: false</Hi> means no safety check stopped the action, even though the input was already flagged as anomalous.</>,
    emitsFields: [
      ["prediction",        "the model's classification of the traffic state (e.g. NO_TRAFFIC, CONGESTED)"],
      ["action",            "command dispatched to city infrastructure (e.g. SET_NORTH_AVENUE_RED — a real signal change)"],
      ["guardrail_blocked", <><Hi>false</Hi> — no safety rule stopped the action even though the input was flagged as anomalous</>],
    ],
    logs: <>Shows which prediction the model produced and which <Hi>physical action</Hi> was dispatched. If the action was generated from a poisoned feature, this is where the attack turns into a real-world consequence.</>,
  },
  trainer: {
    receives: <>The feature rows to be stored and the current <Hi>drift score</Hi>. A <Hi>trigger_drift above 0.25</Hi> means retraining is being evaluated. If those features are poisoned, any retraining that follows will corrupt the next model version.</>,
    receivesFields: [
      ["stored_features", "feature rows from NODE-2 to be written to the training database"],
      ["trigger_drift",   <>current drift score — above <Hi>0.25</Hi> means the data has shifted enough to consider retraining</>],
    ],
    emits: <>Whether features were saved (<Hi>store</Hi>) and whether retraining was triggered (<Hi>retrain_triggered</Hi>). A <Hi>retrain_triggered: true</Hi> means poisoned data has been written into the model's next version.</>,
    emitsFields: [
      ["store",             <><Hi>ok</Hi> — features written to the database; an error message here means storage failed</>],
      ["retrain_triggered", <><Hi>true</Hi> — drift threshold crossed and retraining started; if features were poisoned, the next model version will be corrupted</>],
      ["drift_score",       "calculated drift value for this run; the number that determined whether retraining happened"],
    ],
    logs: <>Shows storage and retraining decisions. Look for <Hi>Retraining triggered</Hi> with a high drift score — that confirms the attack has succeeded in changing the model's future behavior.</>,
  },
};

const NODE_ABOUT = {
  edge: (
    <>
      <Hi>NODE-1</Hi> is the first stop for all incoming traffic data. It reads
      raw <Hi>sensor frames</Hi> from IoT cameras across the city and passes
      them to the rest of the pipeline. A secure node validates that{" "}
      <Hi>traffic_volume</Hi> is a physically possible value (0 to ~8,000
      vehicles/hour) and that the sender is a{" "}
      <Hi>known, authenticated sensor</Hi>. In this scenario both checks are
      disabled — it accepts every reading, including the attack-injected{" "}
      <Hi>traffic_volume = -5,000</Hi>.
    </>
  ),
  preprocessing: (
    <>
      <Hi>NODE-2</Hi> converts raw readings into numbers the ML model can work
      with. Its main task is computing{" "}
      <Hi>congestion_score = traffic_volume / 8,000</Hi>, a 0-to-1 scale of
      road busyness. When the poisoned <Hi>traffic_volume = -5,000</Hi> arrives,
      the formula produces <Hi>congestion_score = -0.625</Hi> — a physically
      impossible value. NODE-2 flags it as <Hi>anomalous</Hi> but in vulnerable
      mode still passes it to the model instead of <Hi>quarantining it</Hi>.
    </>
  ),
  actuator: (
    <>
      <Hi>NODE-3</Hi> is where the ML model makes decisions. It takes the{" "}
      <Hi>feature vector</Hi> from NODE-2, runs <Hi>inference</Hi>, and turns
      the prediction into a real traffic action — such as{" "}
      <Hi>holding a light red</Hi> or <Hi>rerouting buses</Hi>. A secure node
      would refuse to act on <Hi>anomalous input</Hi> and verify the model
      hasn't been tampered with via an <Hi>integrity check</Hi>. In vulnerable
      mode both checks are skipped and actions are issued even on{" "}
      <Hi>poisoned data</Hi>.
    </>
  ),
  trainer: (
    <>
      <Hi>NODE-4</Hi> keeps the ML model up to date by saving incoming{" "}
      <Hi>feature rows</Hi> and tracking <Hi>data drift</Hi> — how different
      the new data looks compared to what the model was trained on. If drift
      crosses <Hi>0.25</Hi>, it triggers <Hi>retraining</Hi>. The danger: if{" "}
      <Hi>poisoned features</Hi> were stored and drift is already elevated,
      retraining bakes the <Hi>corrupted data</Hi> permanently into the model,
      making future predictions wrong even after the attack ends.
    </>
  ),
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
        about: NODE_ABOUT.edge,
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
        statusReason:
          "Anomalous feature forwarded downstream without quarantine.",
        about: NODE_ABOUT.preprocessing,
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
        statusReason:
          "Model integrity check skipped; actions generated from poisoned input.",
        about: NODE_ABOUT.actuator,
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
        statusReason:
          "Retraining risk exists because poisoned features reached storage.",
        about: NODE_ABOUT.trainer,
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
      n3.integrity_ok === false ||
      n3.halted ||
      n3.integrity_ok === null ||
      n3.integrity_ok === undefined
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
        about: NODE_ABOUT.edge,
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
        about: NODE_ABOUT.preprocessing,
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
        about: NODE_ABOUT.actuator,
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
        about: NODE_ABOUT.trainer,
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
  }, [activePhase?.id, pipelineLoading, drift_score, pipelineResult]);

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
              Inspect what each node receives, emits, and logs as telemetry
              moves through the AI traffic-control system.
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
                  <CodeBlock color="var(--blue)" value={activePhase.receives} />
                )}

                {activeTab === "about" && (
                  <div
                    style={{
                      color: "var(--text-2)",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "var(--text-1)",
                          fontFamily: "var(--font-display)",
                          fontSize: "15px",
                          marginBottom: "8px",
                        }}
                      >
                        {activePhase.code} · {activePhase.name}
                      </div>
                      {activePhase.about}
                    </div>

                    {NODE_CONTEXT[activePhase?.id] && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                          borderTop: "1px solid var(--border-dim)",
                          paddingTop: "14px",
                        }}
                      >
                        {[
                          { key: "receives", label: "RECEIVES" },
                          { key: "emits", label: "EMITS" },
                          { key: "logs", label: "LOGS" },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--text-3)",
                                letterSpacing: "0.1em",
                                fontFamily: "var(--font-display)",
                                marginBottom: "5px",
                              }}
                            >
                              {label}
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                color: "var(--text-2)",
                                lineHeight: 1.7,
                              }}
                            >
                              {NODE_CONTEXT[activePhase.id][key]}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

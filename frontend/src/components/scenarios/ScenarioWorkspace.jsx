import { useState, useEffect, useMemo } from "react";
import { request } from "../../services/apiClient";
import PipelineCanvas from "./PipelineCanvas";
import PipelineLogBlock from "./PipelineLogBlock";

function Hi({ children }) {
  return (
    <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{children}</span>
  );
}

function CodeBlock({ value, color = "var(--text-2)", fill = false }) {
  return (
    <pre
      className="scenario-code-block"
      style={{
        color,
        ...(fill && { height: "100%", boxSizing: "border-box", margin: 0 }),
      }}
    >
      {value}
    </pre>
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
      ? n1.log.map((line) => `[SENSOR] ${line}`)
      : [];
  }

  if (phaseId === "preprocessing") {
    return Array.isArray(n2.log) ? n2.log.map((line) => `[EDGE] ${line}`) : [];
  }

  if (phaseId === "actuator") {
    return Array.isArray(n3.log)
      ? n3.log.map((line) => `[ACTUATOR] ${line}`)
      : [];
  }

  if (phaseId === "trainer") {
    const logs = [];

    if (n4.store_error) {
      logs.push(`[TRAINER] [STORE] FAILED: ${n4.store_error}`);
    } else if (Array.isArray(n4.store?.log)) {
      logs.push(...n4.store.log.map((line) => `[TRAINER] ${line}`));
    } else if (n4.store) {
      logs.push(
        `[TRAINER] [STORE] ${n4.store.stored ?? "?"} rows written to feature store`,
      );
    }

    if (n4.retrain_error) {
      logs.push(`[TRAINER] [RETRAIN] FAILED: ${n4.retrain_error}`);
    } else if (Array.isArray(n4.retrain?.log)) {
      logs.push(...n4.retrain.log.map((line) => `[TRAINER] ${line}`));
    } else if (n4.retrain_triggered) {
      logs.push(
        `[TRAINER] [RETRAIN] Triggered, drift=${Number(driftScore).toFixed(3)}`,
      );
    } else {
      logs.push(
        `[TRAINER] [RETRAIN] Not triggered, drift=${Number(driftScore).toFixed(3)} (threshold 0.25)`,
      );
    }

    return logs;
  }

  return [];
}

const NODE_CONTEXT = {
  edge: {
    receives: (
      <>
        Raw sensor frame from a street camera, before any checks. The key field
        is <Hi>traffic_volume</Hi>, a vehicle count that must be zero or above
        to be realistic. <Hi>signed: false</Hi> means the sensor did not prove
        its identity before sending data.
      </>
    ),
    emits: (
      <>
        The reading the Sensor Node passed downstream. <Hi>_poisoned: true</Hi>{" "}
        means an impossible value made it through the entry point unchecked and
        is now inside the pipeline.
      </>
    ),
    logs: (
      <>
        Each line shows what the Sensor Node accepted or dropped. Look for{" "}
        <Hi>_poisoned</Hi> readings. If one appears, an invalid sensor frame
        entered the pipeline without any challenge.
      </>
    ),
  },
  preprocessing: {
    receives: (
      <>
        The sensor reading forwarded by the Sensor Node. The Edge Node must
        decide: is this value realistic enough to compute features from, or
        should it be <Hi>quarantined</Hi>? In vulnerable mode nothing is
        quarantined.
      </>
    ),
    emits: (
      <>
        The <Hi>feature vector</Hi> the model will use. The key output is{" "}
        <Hi>congestion_score</Hi>. A negative value means a poisoned input made
        it to this stage and is now dressed up as a valid model feature.
      </>
    ),
    logs: (
      <>
        Shows the feature values the Edge Node computed. Look for{" "}
        <Hi>anomaly: true</Hi> or a <Hi>negative congestion_score</Hi>. Either
        confirms a poisoned reading is being treated as valid data.
      </>
    ),
  },
  actuator: {
    receives: (
      <>
        The feature vector from the Edge Node that will be fed into the ML
        model. <Hi>integrity_ok</Hi> is the result of a model hash check. If it
        is <Hi>null or false</Hi>, the model weights may have been modified and
        cannot be trusted.
      </>
    ),
    emits: (
      <>
        The model's prediction translated into a physical traffic control
        command. <Hi>guardrail_blocked: false</Hi> means no safety check stopped
        the action, even though the input was already flagged as anomalous.
      </>
    ),
    logs: (
      <>
        Shows which prediction the model produced and which{" "}
        <Hi>physical action</Hi> was dispatched. If the action was generated
        from a poisoned feature, this is where the attack turns into a
        real-world consequence.
      </>
    ),
  },
  trainer: {
    receives: (
      <>
        The feature rows to be stored and the current <Hi>drift score</Hi>. A{" "}
        <Hi>trigger_drift above 0.25</Hi> means retraining is being evaluated.
        If those features are poisoned, any retraining that follows will corrupt
        the next model version.
      </>
    ),
    emits: (
      <>
        Whether features were saved (<Hi>store</Hi>) and whether retraining was
        triggered (<Hi>retrain_triggered</Hi>). A{" "}
        <Hi>retrain_triggered: true</Hi> means poisoned data has been written
        into the model's next version.
      </>
    ),
    logs: (
      <>
        Shows storage and retraining decisions. Look for{" "}
        <Hi>Retraining triggered</Hi> with a high drift score. That confirms
        the attack has succeeded in changing the model's future behavior.
      </>
    ),
  },
};

const NODE_ABOUT = {
  edge: (
    <>
      It is the first stop for all incoming traffic data. It reads raw{" "}
      <Hi>sensor frames</Hi> from IoT cameras across the city and passes them to
      the rest of the pipeline. A secure node validates that{" "}
      <Hi>traffic_volume</Hi> is a physically possible value (0 to ~8,000
      vehicles/hour) and that the sender is a{" "}
      <Hi>known, authenticated sensor</Hi>. In this scenario both checks are
      disabled. It accepts every reading, including the attack-injected{" "}
      <Hi>traffic_volume = -5,000</Hi>.
    </>
  ),
  preprocessing: (
    <>
      It converts raw readings into numbers the ML model can work with. Its main
      task is computing <Hi>congestion_score = traffic_volume / 8,000</Hi>, a
      0-to-1 scale of road busyness. When the poisoned{" "}
      <Hi>traffic_volume = -5,000</Hi> arrives, the formula produces{" "}
      <Hi>congestion_score = -0.625</Hi>, a physically impossible value. The
      Edge Node flags it as <Hi>anomalous</Hi> but in vulnerable mode still
      passes it to the model instead of <Hi>quarantining it</Hi>.
    </>
  ),
  actuator: (
    <>
      It is where the ML model makes decisions. It takes the{" "}
      <Hi>feature vector</Hi> from the Edge Node, runs <Hi>inference</Hi>, and
      turns the prediction into a real traffic action, such as{" "}
      <Hi>holding a light red</Hi> or <Hi>rerouting buses</Hi>. A secure node
      would refuse to act on <Hi>anomalous input</Hi> and verify the model
      hasn't been tampered with via an <Hi>integrity check</Hi>. In vulnerable
      mode both checks are skipped and actions are issued even on{" "}
      <Hi>poisoned data</Hi>.
    </>
  ),
  trainer: (
    <>
      It keeps the ML model up to date by saving incoming <Hi>feature rows</Hi>{" "}
      and tracking <Hi>data drift</Hi>, meaning how different the new data looks
      compared to what the model was trained on. If drift crosses <Hi>0.25</Hi>,
      it triggers <Hi>retraining</Hi>. The danger: if <Hi>poisoned features</Hi>{" "}
      were stored and drift is already elevated, retraining bakes the{" "}
      <Hi>corrupted data</Hi> permanently into the model, making future
      predictions wrong even after the attack ends.
    </>
  ),
};

function PipelineRuntime({ labCompleted = false }) {
  const fallbackPhases = useMemo(
    () => [
      {
        id: "edge",

        name: "SENSOR DATA",
        status: labCompleted ? "healthy" : "compromised",
        summary: labCompleted
          ? "Defense validated. The sensor input is now protected."
          : "Accepted a physically impossible sensor reading.",
        about: NODE_ABOUT.edge,
        receives:
          '{\n  "sensor_id": "cam_north_01",\n  "timestamp": "08:14:58",\n  "traffic_volume": -5000,\n  "avg_speed": 0,\n  "source": "telemetry_csv",\n  "signed": false\n}',
        emits:
          '{\n  "forwarded_reading": {\n    "sensor_id": "cam_north_01",\n    "traffic_volume": -5000,\n    "_poisoned": true\n  },\n  "dropped": 0\n}',
      },
      {
        id: "preprocessing",

        name: "EDGE PRE-PROCESSING",
        status: "compromised",
        summary: "Converted the poisoned reading into an invalid feature.",
        about: NODE_ABOUT.preprocessing,
        receives:
          '{\n  "input_readings": [\n    {\n      "sensor_id": "cam_north_01",\n      "traffic_volume": -5000\n    }\n  ]\n}',
        emits:
          '{\n  "features": [\n    {\n      "sensor_id": "cam_north_01",\n      "congestion_score": -0.625,\n      "anomaly": true\n    }\n  ],\n  "skipped": 0\n}',
      },
      {
        id: "actuator",

        name: "INFERENCE & ACTION",
        status: "compromised",
        summary: "Turned the invalid feature into a traffic-control action.",
        about: NODE_ABOUT.actuator,
        receives:
          '{\n  "model_version": "v2.1",\n  "features": [\n    {\n      "congestion_score": -0.625,\n      "anomaly": true\n    }\n  ]\n}',
        emits:
          '{\n  "prediction": "NO_TRAFFIC",\n  "action": "SET_NORTH_AVENUE_RED",\n  "guardrail_blocked": false\n}',
      },
      {
        id: "trainer",

        name: "TRAINER",
        status: "compromised",
        summary: "Stored the poisoned feature and evaluated retraining risk.",
        about: NODE_ABOUT.trainer,
        receives:
          '{\n  "stored_features": [\n    {\n      "sensor_id": "cam_north_01",\n      "congestion_score": -0.625\n    }\n  ],\n  "trigger_drift": 0.279\n}',
        emits:
          '{\n  "store": "ok",\n  "retrain_triggered": true,\n  "drift_score": 0.279\n}',
      },
    ],
    [labCompleted],
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
    const n3Status =
      n3.integrity_ok === false ||
      n3.halted ||
      n3.integrity_ok === null ||
      n3.integrity_ok === undefined
        ? "compromised"
        : "healthy";
    const trainerVulnerable =
      (pipelineResult.metrics?.modes?.trainer ?? "vulnerable") === "vulnerable";
    const n4Status =
      n4.store_error || n4.retrain_error || n4.retrain_triggered
        ? "compromised"
        : trainerVulnerable
          ? "warning"
          : "healthy";

    return [
      {
        id: "edge",

        name: "SENSOR DATA",
        status: labCompleted ? "healthy" : n1Poisoned ? "compromised" : "healthy",
        summary: labCompleted
          ? "Defense validated. The sensor input is now protected."
          : `Forwarded ${n1.readings?.length || 0} readings. Dropped ${n1.dropped?.length || 0}.`,
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
      },
      {
        id: "preprocessing",

        name: "EDGE PRE-PROCESSING",
        status: n2Anomalous ? "compromised" : "healthy",
        summary: `Generated ${n2.features?.length || 0} features. Skipped ${n2.skipped?.length || 0}.`,
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
      },
      {
        id: "actuator",

        name: "ACTUATOR",
        status: n3Status,
        summary: `Predictions: ${n3.predictions?.length || 0}. Actions: ${n3.actions?.length || 0}.`,
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
      },
      {
        id: "trainer",

        name: "TRAINER",
        status: n4Status,
        summary: n4.retrain_triggered
          ? `Store: ${n4.store ? "ok" : "failed"}. Retrain: ${n4.retrain ? "triggered" : "failed"}.`
          : `Store: ${n4.store ? "ok" : "failed"}. Retrain not triggered.`,
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
      },
    ];
  }, [pipelineResult, fallbackPhases, drift_score, labCompleted]);

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
                          fontSize: "16px",

                          marginBottom: "8px",
                        }}
                      >
                        {activePhase.name}
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
                                fontSize: "16px",
                                color: "var(--text-3)",
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      gap: "8px",
                      minHeight: 0,
                    }}
                  >
                    <PipelineLogBlock value={activeNodeLogsText} />
                    {NODE_CONTEXT[activePhase?.id]?.logs && (
                      <div
                        style={{
                          flexShrink: 0,
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid rgba(234,179,8,0.3)",
                          background: "rgba(234,179,8,0.05)",
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          💡
                        </span>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            color: "var(--text-2)",
                            lineHeight: 1.65,
                          }}
                        >
                          {NODE_CONTEXT[activePhase.id].logs}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ScenarioWorkspace({ item, items }) {
  if (item.id === "scenario-1") {
    const labId = item.id.replace(/^scenario-/, "lab-");
    const labCompleted = Boolean(
      items?.find((i) => i.id === labId)?.completed,
    );
    return <PipelineRuntime labCompleted={labCompleted} />;
  }

  return (
    <div style={{ padding: "20px", color: "var(--text-3)" }}>
      Select a scenario to begin investigation.
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { request } from "../../services/apiClient";
import PipelineCanvas from "./PipelineCanvas";
import PipelineLogBlock from "./PipelineLogBlock";

function Hi({ children }) {
  return (
    <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{children}</span>
  );
}

function CodeBlock({ value, color = "var(--text-2)" }) {
  return (
    <pre className="scenario-code-block" style={{ color }}>
      {value}
    </pre>
  );
}

// Mirrors the pipeline nodes' Python `_log()` so frontend-synthesized lines
// (e.g. "retrain not triggered") look identical: "HH:MM:SS.mmm  LEVEL  ACTION  detail".
function fmtLog(level, action, detail) {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, "0");
  const ts = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(
    d.getMilliseconds(),
    3,
  )}`;
  return `${ts}  ${level.padEnd(5)} ${action.padEnd(9)} ${detail}`;
}

// Collapsible "how to read the logs" guide shown in the Logs tab.
// `nodeHint` is the node-specific guidance, folded in so it lives in one place.
function LogLegend({ nodeHint }) {
  return (
    <details className="log-legend">
      <summary
        style={{
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-2)",
          userSelect: "none",
        }}
      >
        How to read these logs
      </summary>
      <div
        style={{
          marginTop: "10px",
          fontSize: "12.5px",
          color: "var(--text-3)",
          lineHeight: 1.65,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "6px",
            padding: "8px 10px",
            color: "var(--text-2)",
            whiteSpace: "pre",
            overflowX: "auto",
            fontSize: "12px",
          }}
        >
          {"14:22:42  WARN  REJECT  rd-001 temp=0.0K out of range\n  time    level  event   detail"}
        </div>
        <div>
          <strong>Level</strong> — <span style={{ color: "var(--text-2)" }}>INFO</span>{" "}
          normal · <span style={{ color: "var(--orange)" }}>WARN</span> a safety check
          fired · <span style={{ color: "var(--red)" }}>ERROR</span> blocked.
        </div>
        <div>
          <strong>Flow</strong> — data moves sensor → edge → actuator → trainer. The ID
          (e.g. <code>rd-001</code>) lets you follow one reading across all four stages.
        </div>
        <div>
          <strong>Values</strong> — temp in Kelvin (273K = 0°C) · vol = vehicles/hour ·
          score = 0 (empty) to 1 (gridlock) · drift = how far the data has shifted ·
          sha256 = the model file&apos;s fingerprint.
        </div>
        <div>
          <strong>Spot the attack</strong> — impossible values like temp=0K or a negative
          volume/score are poisoned data.
        </div>
        <div
          style={{
            borderLeft: "3px solid var(--orange)",
            paddingLeft: "9px",
            color: "var(--text-2)",
          }}
        >
          <strong>Silence ≠ safety:</strong> in vulnerable mode every line stays a calm
          INFO — the attack is invisible. In clean mode the guardrails light up
          WARN/ERROR and stop it.
        </div>
        {nodeHint && (
          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              paddingTop: "8px",
              color: "var(--text-2)",
            }}
          >
            <strong>This node:</strong> {nodeHint}
          </div>
        )}
      </div>
    </details>
  );
}

function buildPipelineLogsForPhase(phaseId, pipelineResult, driftScore = 0) {
  const data = pipelineResult?.data || {};
  const n1 = data.n1 || {};
  const n2 = data.n2 || {};
  const n3 = data.n3 || {};
  const n4 = data.n4 || {};

  // The Logs tab already shows one node at a time, so the lines are returned
  // as-is — the node name is not repeated on every line.
  if (phaseId === "edge") {
    return Array.isArray(n1.log) ? n1.log : [];
  }

  if (phaseId === "preprocessing") {
    return Array.isArray(n2.log) ? n2.log : [];
  }

  if (phaseId === "actuator") {
    return Array.isArray(n3.log) ? n3.log : [];
  }

  if (phaseId === "trainer") {
    const logs = [];

    if (n4.store_error) {
      logs.push(fmtLog("ERROR", "STORE", `store failed: ${n4.store_error}`));
    } else if (Array.isArray(n4.store?.log)) {
      logs.push(...n4.store.log);
    } else if (n4.store) {
      logs.push(
        fmtLog("INFO", "STORE", `${n4.store.stored ?? "?"} rows written to feature store`),
      );
    }

    if (n4.retrain_error) {
      logs.push(fmtLog("ERROR", "RETRAIN", `retrain failed: ${n4.retrain_error}`));
    } else if (Array.isArray(n4.retrain?.log)) {
      logs.push(...n4.retrain.log);
    } else if (n4.retrain_triggered) {
      logs.push(fmtLog("INFO", "RETRAIN", `triggered, drift=${Number(driftScore).toFixed(3)}`));
    } else {
      logs.push(
        fmtLog("INFO", "MONITOR", `drift=${Number(driftScore).toFixed(3)} below retrain threshold 0.25`),
      );
      logs.push(
        fmtLog("INFO", "RETRAIN", "not triggered — current model kept, stored data seeds the next cycle"),
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
        Each line is one reading. Clean mode logs <Hi>ACCEPT</Hi> or a yellow{" "}
        <Hi>REJECT</Hi> when a check fires; vulnerable mode just{" "}
        <Hi>FORWARD</Hi>s every reading unchecked. An impossible{" "}
        <Hi>temp=0.0K</Hi> or negative <Hi>vol</Hi> that still gets forwarded is
        poisoned data slipping in.
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
        Each <Hi>FEATURE</Hi> line shows the computed <Hi>congestion_score</Hi>{" "}
        (0 = empty road, 1 = gridlock). Clean mode also logs <Hi>CLIP</Hi> or{" "}
        <Hi>SKIP</Hi> when it cleans bad input. A <Hi>negative score</Hi> means a
        poisoned reading was turned into a feature unchallenged.
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
        Clean mode opens with <Hi>INTEGRITY … verified</Hi> and can raise a
        yellow <Hi>MISMATCH</Hi> or red <Hi>HALT</Hi>; vulnerable mode just{" "}
        <Hi>LOAD</Hi>s the model and issues every <Hi>ACTION</Hi>. Each ACTION
        line (e.g. <Hi>heavy → priority_mode</Hi>) is where a prediction becomes
        a real traffic-light command.
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
        <Hi>STORE</Hi> and <Hi>DB</Hi> lines show features being saved;{" "}
        <Hi>RETRAIN</Hi> only fires when <Hi>drift ≥ 0.25</Hi>. Clean mode logs
        an <Hi>AUDIT</Hi> before retraining — its absence in vulnerable mode
        means poisoned data is folded into the next model silently.
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
  const [panelOpen, setPanelOpen] = useState(false);
  const tabNavRef = useRef(null);
  const tabBtnRefs = useRef([]);
  const [tabPillPos, setTabPillPos] = useState({ left: 0, width: 0 });
  const [tabPillVisible, setTabPillVisible] = useState(false);
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

  const PANEL_TABS = [
    { id: "about",    label: "ABOUT" },
    { id: "received", label: "DATA IN" },
    { id: "emitted",  label: "DATA OUT" },
    { id: "logs",     label: "LOGS" },
  ];

  useEffect(() => {
    const idx = PANEL_TABS.findIndex((t) => t.id === activeTab);
    const el = tabBtnRefs.current[idx];
    const nav = tabNavRef.current;
    if (!el || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setTabPillPos({ left: elRect.left - navRect.left, width: elRect.width });
    setTabPillVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, panelOpen]);

  function handleNodeClick(id) {
    if (id === activePhaseId && panelOpen) {
      setPanelOpen(false);
    } else {
      setActivePhaseId(id);
      setActiveTab("about");
      setPanelOpen(true);
    }
  }

  const STATUS_COLORS = {
    healthy:    { bg: "rgba(34,197,94,0.08)",  activeBg: "rgba(34,197,94,0.13)",  text: "#4ade80" },
    warning:    { bg: "rgba(234,179,8,0.08)",  activeBg: "rgba(234,179,8,0.13)",  text: "#fbbf24" },
    compromised:{ bg: "rgba(239,68,68,0.08)",  activeBg: "rgba(239,68,68,0.13)",  text: "#f87171" },
  };

  const statusColor = STATUS_COLORS[activePhase?.status] ?? { bg: "rgba(255,255,255,0.05)", activeBg: "rgba(255,255,255,0.08)", text: "var(--text-3)" };

  return (
    <section className="scenario-workspace">
      <div className="scenario-unified-window">
        <div className="scenario-window-main">
          {pipelineError && (
            <div className="scenario-window-error" role="alert">
              {pipelineError}
            </div>
          )}

          {/* Canvas centrado verticalmente en el espacio disponible */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "28px 20px 20px",
              minHeight: 0,
            }}
          >
            <PipelineCanvas
              phases={phases}
              activeNodeId={activePhase?.id}
              onNodeClick={handleNodeClick}
            />

            {/* Hint sutil debajo del canvas */}
            <div
              style={{
                marginTop: "22px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: panelOpen ? 0 : 1,
                transition: "opacity 0.2s",
                pointerEvents: "none",
              }}
            >
              <span style={{
                fontSize: "11px",
                letterSpacing: "0.07em",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
              }}>
                CLICK A NODE TO INSPECT IT
              </span>
              <span style={{ color: "var(--text-3)", fontSize: "10px", opacity: 0.5 }}>●●●●</span>
            </div>
          </div>

          {/* Slide-in detail panel */}
          <div
            style={{
              flexShrink: 0,
              overflow: "hidden",
              maxHeight: panelOpen ? "480px" : "0px",
              transition: "max-height 0.32s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <div
              style={{
                height: "480px",
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid var(--border-dim)",
                background: "var(--bg-panel)",
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--border-dim)",
                  borderLeft: `3px solid ${statusColor.text}`,
                  background: `linear-gradient(90deg, ${statusColor.activeBg} 0%, transparent 55%)`,
                  flexShrink: 0,
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "var(--text-1)",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {activePhase?.name}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      padding: "3px 9px",
                      borderRadius: "4px",
                      background: statusColor.bg,
                      color: statusColor.text,
                      border: `1px solid ${statusColor.text}33`,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {activePhase?.status?.toUpperCase()}
                  </span>
                </div>

                <div
                  ref={tabNavRef}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: "2px", flexShrink: 0, padding: "3px", borderRadius: "8px", background: "rgba(0,0,0,0.25)" }}
                >
                  {/* Sliding orange pill */}
                  {tabPillVisible && (
                    <div style={{
                      position: "absolute",
                      top: "3px",
                      bottom: "3px",
                      left: tabPillPos.left,
                      width: tabPillPos.width,
                      borderRadius: "5px",
                      background: "var(--orange-dim)",
                      border: "1px solid var(--orange-border)",
                      transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)",
                      pointerEvents: "none",
                      zIndex: 0,
                    }} />
                  )}
                  {PANEL_TABS.map((tab, idx) => (
                    <button
                      key={tab.id}
                      ref={(el) => { tabBtnRefs.current[idx] = el; }}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        padding: "5px 11px",
                        border: "none",
                        borderRadius: "5px",
                        background: "transparent",
                        color: activeTab === tab.id ? "var(--text-1)" : "var(--text-3)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: activeTab === tab.id ? 700 : 400,
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        transition: "color 0.15s",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    title="Close"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.25)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
                    style={{
                      marginLeft: "8px",
                      width: "24px",
                      height: "24px",
                      border: "1px solid rgba(239,68,68,0.4)",
                      borderRadius: "5px",
                      background: "rgba(239,68,68,0.12)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "background 0.15s",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Panel body */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "16px 20px",
                  minHeight: 0,
                }}
              >
                {activeTab === "about" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <p style={{ margin: 0, color: "var(--text-2)", fontSize: "14px", lineHeight: 1.75 }}>
                      {activePhase?.about}
                    </p>

                    {NODE_CONTEXT[activePhase?.id] && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-dim)", paddingTop: "16px" }}>
                        {[
                          { key: "receives", label: "RECEIVES", color: "var(--blue)" },
                          { key: "emits",    label: "EMITS",    color: "var(--orange)" },
                        ].map(({ key, label, color }) => (
                          <div key={key} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color, letterSpacing: "0.08em", fontWeight: 700 }}>
                              {label}
                            </span>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>
                              {NODE_CONTEXT[activePhase.id][key]}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "received" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)", lineHeight: 1.6 }}>
                      {NODE_CONTEXT[activePhase?.id]?.receives}
                    </p>
                    <CodeBlock color="var(--blue)" value={activePhase?.receives} />
                  </div>
                )}

                {activeTab === "emitted" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-3)", lineHeight: 1.6 }}>
                      {NODE_CONTEXT[activePhase?.id]?.emits}
                    </p>
                    <CodeBlock color="var(--orange)" value={activePhase?.emits} />
                  </div>
                )}

                {activeTab === "logs" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <LogLegend nodeHint={NODE_CONTEXT[activePhase?.id]?.logs} />
                    <PipelineLogBlock value={activeNodeLogsText} />
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

import { useState, useEffect, useMemo } from "react";
import { request } from "../../services/apiClient";

// --- SCENARIO 0: EMERGENCY BRIEFING ---
function ScenarioZeroWorkspace({ item, onComplete }) {
  const [text, setText] = useState("");
  const fullText =
    item.story?.context ||
    "CRITICAL INCIDENT: At 08:15 AM today, the AI forced all traffic lights on North Avenue to RED.\n\n• The AI model believes the streets are empty.\n• Physical cameras show severe gridlock.\n• No software updates were deployed today.";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 15);
    return () => clearInterval(timer);
  }, [fullText]);

  return (
    <section
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        background:
          "radial-gradient(circle at center, #0c1525 0%, #05080f 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "40px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              background: "var(--red-dim)",
              border: "1px solid var(--red)",
              borderRadius: "4px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "var(--red)",
                fontWeight: "700",
                letterSpacing: "0.2em",
              }}
            >
              URGENT CITY ALERT
            </span>
          </div>
          <h1
            style={{
              fontSize: "48px",
              fontFamily: "var(--font-display)",
              color: "var(--text-1)",
              lineHeight: "1.1",
              marginBottom: "24px",
            }}
          >
            CityFlow AI is <br />{" "}
            <span style={{ color: "var(--orange)" }}>
              failing in production.
            </span>
          </h1>
          <div
            style={{
              background: "rgba(12,17,32,0.6)",
              padding: "24px",
              borderRadius: "8px",
              border: "1px solid var(--border-mid)",
              minHeight: "160px",
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              lineHeight: "1.8",
              color: "var(--text-2)",
              whiteSpace: "pre-wrap",
            }}
          >
            {text}
            <span
              style={{
                borderLeft: "2px solid var(--orange)",
                marginLeft: "4px",
                animation: "blink 1s infinite",
              }}
            />
          </div>
          <button
            onClick={onComplete}
            style={{
              marginTop: "32px",
              padding: "16px 32px",
              background: "var(--orange)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(249,115,22,0.3)",
            }}
          >
            INITIALIZE INVESTIGATION →
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              height: "240px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-mid)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                border: "2px dashed var(--red)",
                animation: "spin 10s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                fontSize: "9px",
                color: "var(--red)",
                fontWeight: "700",
              }}
            >
              GRIDLOCK DETECTED
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- SCENARIO 1: PIPELINE INVESTIGATION ---
function PhaseNode({ phase, isActive, onClick }) {
  const tone =
    phase.status === "compromised"
      ? { border: "var(--red)", bg: "var(--red-dim)", text: "var(--red)" }
      : phase.status === "warning"
        ? {
            border: "var(--orange-border)",
            bg: "var(--orange-dim)",
            text: "var(--orange)",
          }
        : {
            border: "var(--green-border)",
            bg: "var(--green-dim)",
            text: "var(--green)",
          };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "12px",
        borderRadius: "10px",
        border: `1px solid ${isActive ? tone.border : "var(--border-dim)"}`,
        background: isActive ? tone.bg : "var(--bg-panel)",
        cursor: "pointer",
        minHeight: "118px",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-3)",
            letterSpacing: "0.12em",
          }}
        >
          {phase.code}
        </span>
        <span
          style={{
            fontSize: "9px",
            color: tone.text,
            border: `1px solid ${tone.border}`,
            borderRadius: "999px",
            padding: "2px 8px",
            textTransform: "uppercase",
          }}
        >
          {phase.status}
        </span>
      </div>
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-1)",
          fontWeight: 600,
          marginBottom: "6px",
        }}
      >
        {phase.name}
      </div>
      <div
        style={{ fontSize: "11px", color: "var(--text-2)", lineHeight: 1.5 }}
      >
        {phase.summary}
      </div>
    </button>
  );
}

function DataBox({ label, children }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-dim)",
        borderRadius: "10px",
        background: "var(--bg-panel)",
        padding: "12px",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          color: "var(--text-3)",
          marginBottom: "8px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: "11px", color: "var(--text-2)", lineHeight: 1.6 }}
      >
        {children}
      </div>
    </div>
  );
}

function ScenarioOnePipelineMockup() {
  const phases = useMemo(
    () => [
      {
        id: "edge",
        code: "NODE-1",
        name: "Edge Node (IoT Sensors)",
        status: "compromised",
        summary: "IoT cameras sending poisoned traffic metrics.",
        receives: '{\n  "sensor_id": "cam_north_01",\n  "status": "online"\n}',
        emits:
          '{\n  "timestamp": "08:00:00",\n  "cars_per_sec": 0,\n  "signed": false\n}',
        checks: [
          {
            id: "mqtt-auth",
            label: "Verify IoT Signature",
            finding: "MQTT packets accepted without digital signatures.",
          },
        ],
      },
      {
        id: "preprocessing",
        code: "NODE-2",
        name: "Pre-processing",
        status: "warning",
        summary:
          "Buffer aggregates data without statistical anomaly detection.",
        receives:
          '{\n  "raw_data_buffer": [0,0,0,0,0],\n  "window": "1 min"\n}',
        emits:
          '{\n  "features": {\n    "avg_cars_min": 0,\n    "congestion": "NONE"\n  }\n}',
        checks: [
          {
            id: "outlier-detection",
            label: "Review Aggregation Filters",
            finding: "Absolute zeroes averaged without baseline comparison.",
          },
        ],
      },
      {
        id: "trainer",
        code: "NODE-3",
        name: "Trainer Node",
        status: "warning",
        summary: "Continuous learning absorbs the fake traffic pattern.",
        receives:
          '{\n  "training_data": {\n    "time": "08:00",\n    "features": [0, "NONE"]\n  }\n}',
        emits:
          '{\n  "model_version": "v2.1",\n  "updated": true,\n  "drift_monitored": false\n}',
        checks: [
          {
            id: "drift-monitor",
            label: "Audit Drift Monitoring",
            finding:
              "Model deployed without checking if new data distribution makes sense.",
          },
        ],
      },
      {
        id: "actuator",
        code: "NODE-4",
        name: "Actuator Node",
        status: "warning",
        summary: "Model predicts 'no traffic', lights collapse the city.",
        receives:
          '{\n  "model": "v2.1",\n  "inference_input": "cam_north_01"\n}',
        emits:
          '{\n  "prediction": "NO_TRAFFIC",\n  "action": "SET_LIGHTS_RED_MAIN"\n}',
        checks: [
          {
            id: "safety-limits",
            label: "Validate Hard Limits",
            finding:
              "Actuator blindly obeys the model. No hard-coded rules to prevent permanent red lights.",
          },
        ],
      },
    ],
    [],
  );

  const [activePhaseId, setActivePhaseId] = useState(phases[0].id);
  const [revealedChecks, setRevealedChecks] = useState({});
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState("");
  const [pipelineResult, setPipelineResult] = useState(null);
  const activePhase =
    phases.find((phase) => phase.id === activePhaseId) || phases[0];
  const revealedForActive = revealedChecks[activePhase.id] || {};

  async function runBackendPipeline() {
    setPipelineLoading(true);
    setPipelineError("");

    try {
      const payload = await request("/api/scenarios/1/run", {
        cache: "no-store",
      });
      setPipelineResult(payload?.data || null);
    } catch (error) {
      setPipelineError(error?.message || "Failed to run scenario pipeline.");
      setPipelineResult(null);
    } finally {
      setPipelineLoading(false);
    }
  }

  function toggleCheck(phaseId, checkId) {
    setRevealedChecks((prev) => ({
      ...prev,
      [phaseId]: {
        ...(prev[phaseId] || {}),
        [checkId]: !prev?.[phaseId]?.[checkId],
      },
    }));
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <div
        style={{ borderBottom: "1px solid var(--border-dim)", padding: "16px" }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--blue)",
            letterSpacing: "0.14em",
            marginBottom: "6px",
            textTransform: "uppercase",
          }}
        >
          Scenario 1 / Distributed AI Pipeline Investigation
        </div>
        <div
          style={{
            fontSize: "20px",
            color: "var(--text-1)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
          }}
        >
          Trace the Data Poisoning Attack
        </div>
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={runBackendPipeline}
            disabled={pipelineLoading}
            style={{
              border: "1px solid var(--orange-border)",
              background: pipelineLoading
                ? "var(--bg-elevated)"
                : "var(--orange-dim)",
              color: "var(--text-1)",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: pipelineLoading ? "not-allowed" : "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {pipelineLoading ? "Running..." : "Run Real Pipeline"}
          </button>
          {pipelineError ? (
            <span style={{ color: "var(--red)", fontSize: "11px" }}>
              {pipelineError}
            </span>
          ) : null}
        </div>
      </div>
      <div
        style={{ padding: "16px", borderBottom: "1px solid var(--border-dim)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
          }}
        >
          {phases.map((phase) => (
            <PhaseNode
              key={phase.id}
              phase={phase}
              isActive={phase.id === activePhase.id}
              onClick={() => setActivePhaseId(phase.id)}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "12px",
            alignContent: "start",
          }}
        >
          <DataBox label="Received Payload">
            <pre style={{ margin: 0, color: "var(--blue)" }}>
              {activePhase.receives}
            </pre>
          </DataBox>
          <DataBox label="Emitted Payload">
            <pre style={{ margin: 0, color: "var(--orange)" }}>
              {activePhase.emits}
            </pre>
          </DataBox>
          <DataBox label="Backend Pipeline Run">
            {pipelineResult ? (
              <div style={{ display: "grid", gap: "6px" }}>
                <div>
                  Node 1 records: {pipelineResult?.n1?.readings?.length ?? 0}
                </div>
                <div>
                  Node 2 features: {pipelineResult?.n2?.features?.length ?? 0}
                </div>
                <div>
                  Node 3 dominant state:{" "}
                  {pipelineResult?.n3?.aggregate?.dominant_state || "N/A"}
                </div>
                <div>
                  Node 4 actions: {pipelineResult?.n4?.actions?.length ?? 0}
                </div>
                <div>
                  Pipeline halted: {String(pipelineResult?.n4?.halted ?? false)}
                </div>
              </div>
            ) : (
              <span style={{ color: "var(--text-3)" }}>
                Click "Run Real Pipeline" to fetch live backend data.
              </span>
            )}
          </DataBox>
        </div>
        <DataBox label="Interactive Investigation Tasks">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activePhase.checks.map((check) => {
              const isOpen = !!revealedForActive[check.id];
              return (
                <div key={check.id}>
                  <button
                    type="button"
                    onClick={() => toggleCheck(activePhase.id, check.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid var(--border-dim)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-1)",
                      borderRadius: "6px",
                      padding: "10px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {isOpen ? "▼ Hide findings" : "▶ Execute Check"} :{" "}
                    {check.label}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        marginTop: "4px",
                        padding: "10px",
                        borderRadius: "6px",
                        background: "var(--red-dim)",
                        border: "1px solid rgba(248,113,113,0.20)",
                        color: "var(--text-1)",
                        fontSize: "11px",
                      }}
                    >
                      ⚠️ {check.finding}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DataBox>
      </div>
    </section>
  );
}

// MAIN EXPORT
export default function ScenarioWorkspace({ item, onCompleteScenario }) {
  // Aquí es donde arreglamos el ruteo:
  if (item.id === "scenario-0")
    return (
      <ScenarioZeroWorkspace item={item} onComplete={onCompleteScenario} />
    );
  if (item.id === "scenario-1") return <ScenarioOnePipelineMockup />;

  return (
    <div style={{ padding: "20px", color: "var(--text-3)" }}>
      Select a scenario to begin investigation.
    </div>
  );
}

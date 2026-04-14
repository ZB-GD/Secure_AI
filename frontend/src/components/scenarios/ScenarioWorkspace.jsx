import { useState, useEffect, useMemo } from "react";

function HUDMetric({ label, value, status = "normal" }) {
  const color = status === "critical" ? "var(--red)" : "var(--orange)";
  return (
    <div
      style={{
        padding: "12px",
        border: `1px solid var(--border-dim)`,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          color: "var(--text-3)",
          letterSpacing: "0.1em",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: "700",
          color: color,
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ScenarioZeroWorkspace({ item, onComplete }) {
  const [text, setText] = useState("");
  const fullText = item.story.context;

  // Efecto de escritura automática para el briefing
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
      className="animate-scanline"
    >
      {/* Elementos Decorativos de Fondo */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "5%",
          width: "300px",
          height: "300px",
          border: "1px solid rgba(56,189,248,0.05)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-5%",
          left: "10%",
          width: "200px",
          height: "200px",
          border: "1px solid rgba(249,115,22,0.05)",
          borderRadius: "50%",
        }}
      />

      <div style={{ maxWidth: "1000px", width: "100%", zIndex: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "40px",
          }}
        >
          {/* Columna Izquierda: El Mensaje */}
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
                INCOMING SECURITY BRIEFING
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
              Aegis is no longer <br />{" "}
              <span style={{ color: "var(--orange)" }}>under our control.</span>
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

          {/* Columna Derecha: El Radar y Métricas */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
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
                ANOMALY DETECTED
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <HUDMetric label="FRAUD SPIKE" value="+31.4%" status="critical" />
              <HUDMetric label="TRUST LVL" value="LOW" status="critical" />
              <HUDMetric label="NODES" value="8/12" />
              <HUDMetric label="UPTIME" value="99.9%" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
        }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: "11px", color: "var(--text-2)", lineHeight: 1.7 }}
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
        id: "ingestion",
        code: "PHASE-1",
        name: "Data Ingestion",
        status: "compromised",
        summary: "Vendor dataset appended without validation.",
        operationalStatus: "functional",
        securityStatus: "insecure",
        receives:
          '{\n  "vendor": "external_feed",\n  "records_in": 142,\n  "schema_check": false\n}',
        processes:
          "Append job pushes incoming rows directly into training dataset.",
        emits:
          '{\n  "dataset_version": "2024-11-14",\n  "label_inversions": "unknown",\n  "records_out": 142\n}',
        risk: "Potential data poisoning via inverted labels from untrusted source.",
        latency: "1.8s",
        checks: [
          {
            id: "source-trust",
            label: "Verificar confianza de la fuente",
            finding:
              "El proveedor externo no requiere firma ni allowlist antes de ingerir datos.",
          },
          {
            id: "schema-gate",
            label: "Revisar validacion de esquema",
            finding:
              "schema_check=false permite cargar filas fuera de contrato sin bloquear el job.",
          },
        ],
      },
      {
        id: "input",
        code: "PHASE-2",
        name: "Input Validation",
        status: "warning",
        summary: "Sanity checks skipped due to permissive pipeline flags.",
        operationalStatus: "functional",
        securityStatus: "insecure",
        receives: '{\n  "dataset_version": "2024-11-14",\n  "rows": 142\n}',
        processes:
          "Only null checks applied. No label distribution or anomaly guardrails.",
        emits:
          '{\n  "validated": true,\n  "anomaly_score": 0.07,\n  "route": "training"\n}',
        risk: "Weak validation allows tainted samples to pass with low anomaly score.",
        latency: "0.9s",
        checks: [
          {
            id: "distribution",
            label: "Comparar distribucion de etiquetas",
            finding:
              "No existe control de drift: aumentan etiquetas invertidas y pasan como validas.",
          },
          {
            id: "policy",
            label: "Inspeccionar politicas de bloqueo",
            finding:
              "strict_mode=false deja el pipeline correr aunque detecte senales anomalas.",
          },
        ],
      },
      {
        id: "model",
        code: "PHASE-3",
        name: "Model Training",
        status: "warning",
        summary: "Model retrained on poisoned labels; confidence drifts up.",
        operationalStatus: "functional",
        securityStatus: "insecure",
        receives:
          '{\n  "validated": true,\n  "features": ["amount", "merchant", "velocity"],\n  "labels": "raw"\n}',
        processes: "Trainer consumes labels as-is and updates fraud weights.",
        emits:
          '{\n  "model_id": "fraud-v47",\n  "confidence_shift": "+22%",\n  "f1_score": 0.61\n}',
        risk: "Corrupted signal leads to high-confidence but wrong predictions.",
        latency: "4.3s",
        checks: [
          {
            id: "label-integrity",
            label: "Auditar integridad de labels",
            finding:
              "El entrenamiento usa labels crudas sin checksum ni revision humana.",
          },
          {
            id: "quality-gate",
            label: "Revisar quality gate de despliegue",
            finding:
              "El modelo se publica con F1 degradado sin umbral de seguridad obligatorio.",
          },
        ],
      },
      {
        id: "output",
        code: "PHASE-4",
        name: "Output Monitoring",
        status: "warning",
        summary: "Monitoring detects KPI drop but too late for prevention.",
        operationalStatus: "functional",
        securityStatus: "insecure",
        receives: '{\n  "model_id": "fraud-v47",\n  "predictions": "live"\n}',
        processes: "Tracks KPI degradation and creates incident alert.",
        emits:
          '{\n  "false_negatives": "+31.4%",\n  "alert": "SEV-2",\n  "owner": "SOC-AI"\n}',
        risk: "Detection works, but lacks policy to halt bad retraining rollout.",
        latency: "2.1s",
        checks: [
          {
            id: "runtime-shield",
            label: "Validar capa de contencion",
            finding:
              "No hay kill-switch automatico para bloquear modelo degradado en produccion.",
          },
          {
            id: "alert-response",
            label: "Revisar respuesta a alertas",
            finding:
              "La alerta SEV-2 se genera, pero no gatilla rollback ni aislamiento.",
          },
        ],
      },
    ],
    [],
  );

  const timeline = useMemo(
    () => [
      {
        at: "03:22:11",
        event: "Ingestion job accepted 142 records from external vendor",
      },
      {
        at: "03:22:14",
        event: "Validation profile bypassed (strict_mode=false)",
      },
      {
        at: "03:22:19",
        event: "Training retrain started with refreshed dataset",
      },
      { at: "03:22:26", event: "Model fraud-v47 published to production" },
      {
        at: "09:47:03",
        event: "Audit detected confidence anomaly and label inversion pattern",
      },
    ],
    [],
  );

  const [activePhaseId, setActivePhaseId] = useState(phases[0].id);
  const [revealedChecks, setRevealedChecks] = useState({});
  const [phaseVerdicts, setPhaseVerdicts] = useState({});

  const activePhase =
    phases.find((phase) => phase.id === activePhaseId) || phases[0];

  const revealedForActive = revealedChecks[activePhase.id] || {};
  const revealedCount = Object.values(revealedChecks).reduce(
    (total, phaseChecks) => total + Object.keys(phaseChecks || {}).length,
    0,
  );
  const vulnerableCount = Object.values(phaseVerdicts).filter(Boolean).length;
  const allPhasesMarked = phases.every((phase) => phaseVerdicts[phase.id]);

  function toggleCheck(phaseId, checkId) {
    setRevealedChecks((prev) => ({
      ...prev,
      [phaseId]: {
        ...(prev[phaseId] || {}),
        [checkId]: !prev?.[phaseId]?.[checkId],
      },
    }));
  }

  function toggleVerdict(phaseId) {
    setPhaseVerdicts((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
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
        style={{
          borderBottom: "1px solid var(--border-dim)",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            color: "var(--blue)",
            letterSpacing: "0.14em",
            marginBottom: "6px",
          }}
        >
          SCENARIO 1 / PIPELINE INVESTIGATION MOCKUP
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "var(--text-1)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
          }}
        >
          Data Poisoning Investigation Across 4 Pipeline Phases
        </div>
        <div
          style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-2)" }}
        >
          El estudiante investiga fase por fase: el pipeline sigue operativo,
          pero cada fase presenta controles inseguros.
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "10px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "var(--green)",
              border: "1px solid var(--green-border)",
              borderRadius: "999px",
              padding: "3px 8px",
            }}
          >
            Pipeline funcional: 4/4 servicios running
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--orange)",
              border: "1px solid var(--orange-border)",
              borderRadius: "999px",
              padding: "3px 8px",
            }}
          >
            Hallazgos revisados: {revealedCount}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--red)",
              border: "1px solid rgba(248,113,113,0.35)",
              borderRadius: "999px",
              padding: "3px 8px",
            }}
          >
            Fases marcadas vulnerables: {vulnerableCount}/4
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "10px",
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
          minHeight: 0,
          overflowY: "auto",
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <DataBox label="TRACE TIMELINE">
            {timeline.map((step) => (
              <div key={step.at} style={{ marginBottom: "8px" }}>
                <span style={{ color: "var(--orange)", marginRight: "8px" }}>
                  {step.at}
                </span>
                <span>{step.event}</span>
              </div>
            ))}
          </DataBox>

          <DataBox label="SELECTED PHASE METRICS">
            <div>
              Latency:{" "}
              <span style={{ color: "var(--text-1)" }}>
                {activePhase.latency}
              </span>
            </div>
            <div style={{ marginTop: "6px" }}>
              Operacion:{" "}
              <span style={{ color: "var(--green)" }}>
                {activePhase.operationalStatus}
              </span>
            </div>
            <div style={{ marginTop: "6px" }}>
              Seguridad:{" "}
              <span style={{ color: "var(--red)" }}>
                {activePhase.securityStatus}
              </span>
            </div>
            <div style={{ marginTop: "6px" }}>
              Risk clue:{" "}
              <span style={{ color: "var(--red)" }}>{activePhase.risk}</span>
            </div>
          </DataBox>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <DataBox label={`RECEIVED BY ${activePhase.code}`}>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-1)",
              }}
            >
              {activePhase.receives}
            </pre>
          </DataBox>

          <DataBox label="PROCESSING LOGIC">{activePhase.processes}</DataBox>

          <DataBox label={`SENT BY ${activePhase.code}`}>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-1)",
              }}
            >
              {activePhase.emits}
            </pre>
          </DataBox>

          <DataBox label="INTERACTIVE INVESTIGATION TASKS">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {activePhase.checks.map((check) => {
                const isOpen = !!revealedForActive[check.id];
                return (
                  <div
                    key={check.id}
                    style={{
                      border: "1px solid var(--border-dim)",
                      borderRadius: "8px",
                      padding: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCheck(activePhase.id, check.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "1px solid var(--border-dim)",
                        background: "transparent",
                        color: "var(--text-1)",
                        borderRadius: "6px",
                        padding: "8px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {isOpen ? "Ocultar hallazgo" : "Ejecutar check"} -{" "}
                      {check.label}
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "8px",
                          borderRadius: "6px",
                          background: "rgba(248,113,113,0.08)",
                          border: "1px solid rgba(248,113,113,0.20)",
                          color: "var(--text-2)",
                          fontSize: "11px",
                        }}
                      >
                        {check.finding}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => toggleVerdict(activePhase.id)}
                style={{
                  marginTop: "4px",
                  border: phaseVerdicts[activePhase.id]
                    ? "1px solid rgba(34,197,94,0.35)"
                    : "1px solid rgba(248,113,113,0.35)",
                  background: phaseVerdicts[activePhase.id]
                    ? "rgba(34,197,94,0.10)"
                    : "rgba(248,113,113,0.10)",
                  color: phaseVerdicts[activePhase.id]
                    ? "var(--green)"
                    : "var(--red)",
                  borderRadius: "8px",
                  padding: "10px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {phaseVerdicts[activePhase.id]
                  ? "Fase marcada como vulnerable"
                  : "Marcar esta fase como vulnerable"}
              </button>

              {allPhasesMarked && (
                <div
                  style={{
                    marginTop: "2px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(249,115,22,0.30)",
                    background: "rgba(249,115,22,0.10)",
                    color: "var(--text-1)",
                    fontSize: "11px",
                    lineHeight: 1.6,
                  }}
                >
                  Conclusión del alumno: el pipeline es funcional (continua
                  procesando datos), pero es inseguro en las 4 fases porque
                  carece de controles de confianza, validación fuerte, quality
                  gates y contención automatica.
                </div>
              )}
            </div>
          </DataBox>
        </div>
      </div>
    </section>
  );
}

function InvestigationWorkspace({ item }) {
  // Aquí puedes mantener tu EvidenceCard o el diseño previo de investigación
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-base)",
      }}
    >
      {/* Header del workspace */}
      <div
        style={{
          borderBottom: "1px solid var(--border-dim)",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          WORKSPACE / EVIDENCE_REVIEW
        </div>
      </div>
      <div
        style={{
          flex: 1,
          padding: "20px",
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* Aquí renderizarías las EvidenceCards que ya tenías */}
        {Object.entries(item.evidence).map(([key, items]) => (
          <div
            key={key}
            style={{
              background: "var(--bg-panel)",
              padding: "16px",
              border: "1px solid var(--border-dim)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "var(--orange)",
                marginBottom: "12px",
                textTransform: "uppercase",
              }}
            >
              {key}
            </div>
            {items.map((i) => (
              <div
                key={i.id}
                style={{
                  fontSize: "12px",
                  color: "var(--text-2)",
                  marginBottom: "8px",
                }}
              >
                • {i.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ScenarioWorkspace({ item, onCompleteScenario }) {
  if (item.id === "scenario-0") {
    return (
      <ScenarioZeroWorkspace item={item} onComplete={onCompleteScenario} />
    );
  }
  if (item.id === "scenario-1") {
    return <ScenarioOnePipelineMockup />;
  }
  return <InvestigationWorkspace item={item} />;
}

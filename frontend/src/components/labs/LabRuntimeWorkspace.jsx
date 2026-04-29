import { useState, useRef, useEffect } from "react";
import RemoteDesktopPanel from "../workspace/RemoteDesktopPanel";
import AttackControls from "./AttackControls";
import LabMetrics from "./LabMetrics";
import RuntimeLogsPanel from "./RuntimeLogsPanel";
import { useLabRuntime } from "../../hooks/useLabRuntime";
import { request } from "../../services/apiClient";

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: "guide", label: "Guide", icon: "◈" },
  { id: "logs", label: "Logs", icon: "≡" },
  { id: "metrics", label: "Metrics", icon: "◎" },
  { id: "quiz", label: "Quiz", icon: "✦" },
];

// ─── Sub-component: TabBar ───────────────────────────────────────────────────
function TabBar({ activeTab, onSelect, quizUnlocked }) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-panel)",
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const locked = tab.id === "quiz" && !quizUnlocked;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !locked && onSelect(tab.id)}
            title={locked ? "Complete the lab to unlock" : undefined}
            style={{
              flex: 1,
              padding: "11px 8px",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--orange)"
                : "2px solid transparent",
              background: isActive ? "var(--bg-elevated)" : "transparent",
              color: locked
                ? "var(--text-3)"
                : isActive
                  ? "var(--text-1)"
                  : "var(--text-3)",
              fontSize: "10px",
              letterSpacing: "0.10em",
              fontFamily: "var(--font-mono)",
              cursor: locked ? "not-allowed" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              transition: "all 0.15s",
              opacity: locked ? 0.4 : 1,
            }}
          >
            <span style={{ fontSize: "13px" }}>{tab.icon}</span>
            {tab.label.toUpperCase()}
            {tab.id === "quiz" && !quizUnlocked && (
              <span style={{ fontSize: "9px", color: "var(--text-3)" }}>
                LOCKED
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sub-component: GuideTab ─────────────────────────────────────────────────
function GuideTab({
  item,
  currentStep,
  currentAnswer,
  onAnswerChange,
  onPrevStep,
  onNextStep,
}) {
  const [showHint, setShowHint] = useState(false);

  if (!item?.guide?.steps || !currentStep) {
    return (
      <div
        style={{ padding: "24px", color: "var(--text-3)", fontSize: "13px" }}
      >
        Loading guide...
      </div>
    );
  }

  const totalSteps = item.guide.steps.length;
  const stepIndex = item.currentStepIndex ?? 0;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  function isValid(answer) {
    const value = (answer || "").toLowerCase().trim();
    if (!value) return false;
    return (currentStep.expectedKeywords || []).some((kw) => {
      const keyword = kw.toLowerCase().trim();
      if (keyword.includes(" ")) return value.includes(keyword);
      const regex = new RegExp(
        `(^|\\b)${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\b|$)`,
        "i",
      );
      return regex.test(value);
    });
  }

  const answerValid = isValid(currentAnswer);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Progress header */}
      <div
        style={{
          padding: "16px 18px 12px",
          borderBottom: "1px solid var(--border-dim)",
          flexShrink: 0,
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
          <div
            style={{
              fontSize: "10px",
              color: "var(--orange)",
              letterSpacing: "0.12em",
            }}
          >
            {item.phase?.toUpperCase()}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-3)" }}>
            {stepIndex + 1} / {totalSteps}
          </div>
        </div>
        <div
          style={{
            height: "2px",
            background: "var(--bg-surface)",
            borderRadius: "2px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "var(--orange)",
              transition: "width 0.4s",
              borderRadius: "2px",
            }}
          />
        </div>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            color: "var(--text-1)",
            fontFamily: "var(--font-display)",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {currentStep.title}
        </h3>

        <div
          style={{
            background: "var(--bg-surface)",
            padding: "14px",
            borderRadius: "8px",
            border: "1px solid var(--border-dim)",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "var(--text-3)",
              letterSpacing: "0.1em",
              marginBottom: "6px",
            }}
          >
            INSTRUCTIONS
          </div>
          <p
            style={{
              fontSize: "12px",
              lineHeight: 1.7,
              color: "var(--text-2)",
              margin: 0,
            }}
          >
            {currentStep.body}
          </p>
        </div>

        <div
          style={{
            background: "rgba(249,115,22,0.05)",
            padding: "14px",
            borderRadius: "8px",
            border: "1px solid var(--orange-border)",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "var(--orange)",
              letterSpacing: "0.1em",
              marginBottom: "6px",
            }}
          >
            OBSERVATION
          </div>
          <p
            style={{
              fontSize: "12px",
              lineHeight: 1.7,
              color: "var(--text-2)",
              margin: 0,
            }}
          >
            {currentStep.observation}
          </p>
        </div>

        {currentStep.hint && (
          <div>
            <button
              onClick={() => setShowHint(!showHint)}
              style={{
                background: "transparent",
                border: "1px solid var(--border-mid)",
                color: "var(--text-3)",
                fontSize: "10px",
                padding: "5px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {showHint ? "✕ HIDE HINT" : "💡 SHOW HINT"}
            </button>
            {showHint && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px 12px",
                  background: "rgba(56,189,248,0.05)",
                  border: "1px solid var(--blue-dim)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--blue)",
                }}
              >
                {currentStep.hint}
              </div>
            )}
          </div>
        )}

        {/* Answer input */}
        <div style={{ marginTop: "auto", paddingTop: "8px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-1)",
              fontWeight: 600,
              marginBottom: "10px",
            }}
          >
            {currentStep.question}
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={currentAnswer || ""}
              onChange={(e) => onAnswerChange(currentStep.id, e.target.value)}
              placeholder={currentStep.placeholder}
              style={{
                width: "100%",
                background: "var(--bg-base)",
                border: `1px solid ${answerValid ? "var(--green)" : "var(--border-mid)"}`,
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "12px",
                color: "var(--text-1)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {answerValid && (
              <span
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "10px",
                  color: "var(--green)",
                  fontSize: "12px",
                }}
              >
                ✓
              </span>
            )}
          </div>
          {currentAnswer && !answerValid && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "11px",
                color: "var(--red)",
              }}
            >
              Incorrect. Review the workspace.
            </div>
          )}
        </div>
      </div>

      {/* Navigation footer */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          borderTop: "1px solid var(--border-dim)",
          background: "var(--bg-elevated)",
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <button
          onClick={() => {
            setShowHint(false);
            onPrevStep();
          }}
          disabled={stepIndex === 0}
          style={{
            padding: "9px 14px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border-mid)",
            color: stepIndex === 0 ? "var(--text-3)" : "var(--text-1)",
            opacity: stepIndex === 0 ? 0.3 : 1,
            cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          ← PREV
        </button>
        <button
          onClick={() => {
            setShowHint(false);
            onNextStep();
          }}
          disabled={!answerValid}
          style={{
            flex: 1,
            padding: "9px 14px",
            borderRadius: "6px",
            background: answerValid ? "var(--green)" : "var(--orange)",
            border: "none",
            color: "#fff",
            cursor: answerValid ? "pointer" : "not-allowed",
            opacity: answerValid ? 1 : 0.65,
            fontSize: "11px",
            fontWeight: 600,
            boxShadow: answerValid ? "0 0 12px rgba(34,197,94,0.25)" : "none",
          }}
        >
          {stepIndex === totalSteps - 1 ? "COMPLETE ✓" : "NEXT →"}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component: LogsTab ──────────────────────────────────────────────────
function LogsTab({ logs, statusLabel }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const statusColor =
    statusLabel === "running"
      ? "var(--green)"
      : statusLabel === "error"
        ? "var(--red)"
        : "var(--orange)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-dim)",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-3)",
            letterSpacing: "0.1em",
          }}
        >
          PIPELINE LOG STREAM
        </div>
        <span
          style={{
            fontSize: "10px",
            color: statusColor,
            border: `1px solid ${statusColor}`,
            borderRadius: "999px",
            padding: "2px 8px",
          }}
        >
          {statusLabel?.toUpperCase()}
        </span>
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#05080f",
          padding: "14px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          lineHeight: 1.7,
          color: "var(--text-2)",
        }}
      >
        {logs?.length > 0 ? (
          logs.map((line, i) => (
            <div key={i} style={{ marginBottom: "3px" }}>
              {line}
            </div>
          ))
        ) : (
          <div style={{ color: "var(--text-3)" }}>
            Waiting for runtime events...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: MetricsTab ───────────────────────────────────────────────
function MetricsTab({ runtime, onAttack, attackLoading }) {
  const [retrainLoading, setRetrainLoading] = useState(false);

  async function handleManualRetrain() {
    setRetrainLoading(true);
    try {
      await request("/api/trainer/retrain", {
        method: "POST",
        body: JSON.stringify({ mode: "clean" }),
      });
      // quick visual feedback by refreshing status (caller has no access here),
      // we simply set a short-lived event in the runtime lastEvent via custom event
      const evt = new CustomEvent("lab:retrain:triggered", {
        detail: { time: new Date().toISOString() },
      });
      window.dispatchEvent(evt);
      alert("Retrain requested (clean). Check backend logs for progress.");
    } catch (err) {
      alert("Retrain failed: " + (err?.message || err));
    } finally {
      setRetrainLoading(false);
    }
  }
  return (
    <div
      style={{
        overflowY: "auto",
        height: "100%",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <AttackControls onAttack={onAttack} loading={attackLoading} />
        <button
          onClick={handleManualRetrain}
          disabled={retrainLoading}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border-dim)",
            background: retrainLoading ? "var(--bg-surface)" : "var(--blue)",
            color: "#fff",
            cursor: retrainLoading ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          {retrainLoading ? "Retraining…" : "Manual Retrain"}
        </button>
      </div>
      <LabMetrics
        driftScore={runtime.driftScore}
        accuracy={runtime.accuracy}
        isCompromised={runtime.isCompromised}
        statusLabel={runtime.statusLabel}
        lastEvent={runtime.lastEvent}
      />
    </div>
  );
}

// ─── Sub-component: QuizTab ──────────────────────────────────────────────────
function QuizTab({ item, phase }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [tutorFeedback, setTutorFeedback] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState("");

  const quiz = item?.quiz || [];
  const allAnswered =
    quiz.length > 0 && Object.keys(answers).length === quiz.length;
  const correctCount = quiz.filter(
    (q, i) => answers[i] === q.correctAnswerIndex,
  ).length;

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitted(true);
    setTutorLoading(true);
    setTutorError("");

    const wrongItems = quiz
      .map((q, i) =>
        answers[i] !== q.correctAnswerIndex
          ? `- "${q.question}" → Alumno eligió: "${q.options[answers[i]]}" (correcta: "${q.options[q.correctAnswerIndex]}")`
          : null,
      )
      .filter(Boolean)
      .join("\n");

    const prompt = `Eres el Tutor de Seguridad de CityFlow AI.
Contexto del laboratorio: ${phase || "Laboratorio de ciberseguridad en pipelines de IA"}.
El alumno ha completado el quiz con ${correctCount}/${quiz.length} respuestas correctas.
${wrongItems ? `\nRespuestas incorrectas:\n${wrongItems}` : "\nEl alumno respondió todo correctamente."}

Por favor:
1. Felicita o anima según la puntuación de forma breve.
2. Explica el concepto detrás de cada fallo en 2-3 frases, de forma didáctica.
3. Relaciona los errores con el pipeline de IA afectado.
4. Sugiere una acción concreta para reforzar los puntos débiles.
Máximo 220 palabras. Responde en español.`;

    try {
      const data = await request("/api/rag/chat", {
        method: "POST",
        body: JSON.stringify({
          message: prompt,
          context: phase || "Laboratorio general",
        }),
      });
      setTutorFeedback(data.response);
    } catch (err) {
      setTutorError(`Error al obtener feedback: ${err.message}`);
    } finally {
      setTutorLoading(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setTutorFeedback("");
    setTutorError("");
  }

  if (quiz.length === 0) {
    return (
      <div
        style={{
          padding: "32px 20px",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: "13px",
        }}
      >
        No hay preguntas configuradas para este laboratorio.
      </div>
    );
  }

  return (
    <div
      style={{
        overflowY: "auto",
        height: "100%",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Score bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 14px",
          background: "var(--bg-elevated)",
          borderRadius: "8px",
          border: "1px solid var(--border-dim)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--text-1)",
              fontFamily: "var(--font-display)",
            }}
          >
            {submitted
              ? `${correctCount}/${quiz.length}`
              : `${Object.keys(answers).length}/${quiz.length}`}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.08em",
            }}
          >
            {submitted ? "correctas" : "respondidas"}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            height: "4px",
            background: "var(--bg-surface)",
            borderRadius: "2px",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "2px",
              transition: "width 0.4s",
              width: submitted
                ? `${Math.round((correctCount / quiz.length) * 100)}%`
                : `${Math.round((Object.keys(answers).length / quiz.length) * 100)}%`,
              background: submitted
                ? correctCount / quiz.length >= 0.75
                  ? "var(--green)"
                  : "var(--orange)"
                : "var(--border-mid)",
            }}
          />
        </div>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              background: allAnswered ? "var(--orange)" : "var(--bg-surface)",
              color: allAnswered ? "#fff" : "var(--text-3)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: allAnswered ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            Evaluar
          </button>
        ) : (
          <button
            onClick={reset}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-dim)",
              background: "transparent",
              color: "var(--text-2)",
              fontSize: "11px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Reintentar
          </button>
        )}
      </div>

      {/* Questions */}
      {quiz.map((q, qi) => (
        <div
          key={qi}
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--border-dim)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-1)",
                lineHeight: 1.5,
                flex: 1,
              }}
            >
              {q.question}
            </div>
            {submitted && (
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  flexShrink: 0,
                  background:
                    answers[qi] === q.correctAnswerIndex
                      ? "var(--green-dim)"
                      : "var(--red-dim)",
                  color:
                    answers[qi] === q.correctAnswerIndex
                      ? "var(--green)"
                      : "var(--red)",
                  border: `1px solid ${answers[qi] === q.correctAnswerIndex ? "var(--green-border)" : "rgba(248,113,113,0.28)"}`,
                }}
              >
                {answers[qi] === q.correctAnswerIndex ? "CORRECT" : "WRONG"}
              </span>
            )}
          </div>
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {q.options.map((opt, oi) => {
              let bg = "var(--bg-base)";
              let border = "var(--border-dim)";
              let color = "var(--text-2)";
              if (submitted) {
                if (oi === q.correctAnswerIndex) {
                  bg = "var(--green-dim)";
                  border = "var(--green-border)";
                  color = "var(--green)";
                } else if (
                  oi === answers[qi] &&
                  answers[qi] !== q.correctAnswerIndex
                ) {
                  bg = "var(--red-dim)";
                  border = "rgba(248,113,113,0.28)";
                  color = "var(--red)";
                }
              } else if (answers[qi] === oi) {
                border = "var(--orange-border)";
                bg = "var(--orange-dim)";
                color = "var(--text-1)";
              }
              return (
                <button
                  key={oi}
                  onClick={() =>
                    !submitted && setAnswers((prev) => ({ ...prev, [qi]: oi }))
                  }
                  disabled={submitted}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${border}`,
                    background: bg,
                    color,
                    fontSize: "11px",
                    cursor: submitted ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{ fontSize: "10px", opacity: 0.6, flexShrink: 0 }}
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <div
              style={{
                padding: "10px 14px",
                borderTop: "1px solid var(--border-dim)",
                background: "rgba(56,189,248,0.04)",
                fontSize: "11px",
                color: "var(--text-2)",
                lineHeight: 1.6,
                borderLeft: "2px solid var(--blue-dim)",
              }}
            >
              {q.explanation}
            </div>
          )}
        </div>
      ))}

      {/* Tutor feedback */}
      {submitted && (
        <div
          style={{
            border: "1px solid var(--border-dim)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-dim)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: tutorFeedback ? "var(--green)" : "var(--orange)",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-1)",
                fontFamily: "var(--font-mono)",
              }}
            >
              CITYFLOW TUTOR — Feedback personalizado
            </span>
          </div>
          <div style={{ padding: "14px 16px", minHeight: "80px" }}>
            {tutorLoading && (
              <div style={{ color: "var(--text-3)", fontSize: "12px" }}>
                Analizando tus respuestas...
              </div>
            )}
            {tutorError && (
              <div style={{ color: "var(--red)", fontSize: "12px" }}>
                {tutorError}
              </div>
            )}
            {tutorFeedback && (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-1)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {tutorFeedback}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function LabRuntimeWorkspace({
  item,
  currentStep,
  currentAnswer,
  onAnswerChange,
  onPrevStep,
  onNextStep,
}) {
  const [activeTab, setActiveTab] = useState("guide");
  const containerRef = useRef(null);
  const [rightWidth, setRightWidth] = useState(800);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const hasUserResized = useRef(false);

  useGlobalDragHandlers(
    containerRef,
    isDragging,
    dragStartX,
    dragStartWidth,
    setRightWidth,
  );
  useInitialRightWidth(containerRef, hasUserResized, setRightWidth);

  const {
    remoteUrl,
    remoteLoading,
    remoteError,
    retryRuntime,
    triggerAttack,
    attackLoading,
    runtime,
    logs,
  } = useLabRuntime(item?.id, {
    autoStart: true,
    pollIntervalMs: 3000,
    logPollIntervalMs: 1200,
    logLimit: 200,
  });

  // Unlock quiz when lab is complete (last step answered)
  const totalSteps = item?.guide?.steps?.length ?? 0;
  const stepIndex = item?.currentStepIndex ?? 0;
  const quizUnlocked = stepIndex >= totalSteps - 1 && !!item?.guide?.steps;

  return (
    <section
      ref={containerRef}
      style={{
        display: "grid",
        gridTemplateColumns: `1fr 12px ${rightWidth}px`,
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-base)",
        gap: 0,
      }}
    >
      {/* ── LEFT: VM always visible ─────────────────────────────────────── */}
      <div style={{ minWidth: 0, minHeight: 0, padding: "14px 8px 14px 14px" }}>
        <RemoteDesktopPanel
          item={item}
          remoteUrl={remoteUrl}
          remoteLoading={remoteLoading}
          remoteError={remoteError}
          onRetry={retryRuntime}
        />
      </div>

      {/* Splitter */}
      <div
        onMouseDown={(e) => {
          isDragging.current = true;
          hasUserResized.current = true;
          dragStartX.current = e.clientX;
          dragStartWidth.current = rightWidth;
          document.body.style.cursor = "col-resize";
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          isDragging.current = true;
          hasUserResized.current = true;
          dragStartX.current = touch.clientX;
          dragStartWidth.current = rightWidth;
        }}
        style={{
          width: "12px",
          cursor: "col-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            width: "2px",
            height: "48px",
            background: "var(--border-dim)",
            borderRadius: "2px",
            opacity: 0.9,
          }}
        />
      </div>

      {/* ── RIGHT: Tabbed panel ──────────────────────────────────────────── */}
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <TabBar
          activeTab={activeTab}
          onSelect={setActiveTab}
          quizUnlocked={quizUnlocked}
        />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeTab === "guide" && (
            <GuideTab
              item={item}
              currentStep={currentStep}
              currentAnswer={currentAnswer}
              onAnswerChange={onAnswerChange}
              onPrevStep={onPrevStep}
              onNextStep={onNextStep}
            />
          )}
          {activeTab === "logs" && (
            <LogsTab logs={logs} statusLabel={runtime.statusLabel} />
          )}
          {activeTab === "metrics" && (
            <MetricsTab
              runtime={runtime}
              onAttack={triggerAttack}
              attackLoading={attackLoading}
            />
          )}
          {activeTab === "quiz" && quizUnlocked && (
            <QuizTab item={item} phase={item?.phase} />
          )}
        </div>
      </aside>
    </section>
  );
}

function useGlobalDragHandlers(
  containerRef,
  isDragging,
  dragStartX,
  dragStartWidth,
  setRightWidth,
) {
  useEffect(() => {
    function onMove(e) {
      if (!isDragging.current) return;
      if (e.touches && e.touches.length) e.preventDefault();
      const clientX = e.clientX != null ? e.clientX : e.touches?.[0]?.clientX;
      if (clientX == null) return;
      // Invert delta so dragging direction matches pointer movement
      const delta = dragStartX.current - clientX;
      const containerWidth =
        containerRef.current?.clientWidth || window.innerWidth;
      const minWidth = 300;
      const maxWidth = Math.max(minWidth, containerWidth - 120);
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, dragStartWidth.current + delta),
      );
      setRightWidth(newWidth);
    }

    function onUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [containerRef, isDragging, dragStartX, dragStartWidth, setRightWidth]);
}

// Set a better initial right panel width so the desktop fills available space
// without large empty margins. Respect user's manual resize afterwards.
function useInitialRightWidth(containerRef, hasUserResized, setRightWidth) {
  useEffect(() => {
    function setInitial() {
      if (hasUserResized.current) return;
      const containerWidth =
        containerRef.current?.clientWidth || window.innerWidth;
      // Aim for ~35% of container but clamp between 420 and 900px
      const desired = Math.round(
        Math.max(420, Math.min(900, Math.floor(containerWidth * 0.35))),
      );
      setRightWidth(desired);
    }

    setInitial();
    function onResize() {
      setInitial();
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [containerRef, hasUserResized, setRightWidth]);
}

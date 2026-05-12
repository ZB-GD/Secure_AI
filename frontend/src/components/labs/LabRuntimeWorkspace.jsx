import { useState, useRef, useEffect } from "react";
import RemoteDesktopPanel from "../workspace/RemoteDesktopPanel";
import AttackControls from "./AttackControls";
import LabMetrics from "./LabMetrics";
import RuntimeLogsPanel from "./RuntimeLogsPanel";
import { useLabRuntime } from "../../hooks/useLabRuntime";
import { request } from "../../services/apiClient";
import LabGuide from "./LabGuide";

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

// ─── Sub-component: MetricsTab ───────────────────────────────────────────────
function MetricsTab({ runtime }) {
  const driftColor = runtime.driftScore >= 25 ? "var(--red)" : "var(--green)";
  const accuracyColor = runtime.accuracy < 70 ? "var(--red)" : "var(--green)";
  const protectedMode =
    runtime.statusLabel === "protected" || runtime.defenseEnabled;
  const statusColor = runtime.isCompromised
    ? "var(--red)"
    : protectedMode
      ? "var(--green)"
      : "var(--orange)";
  const scoreColor = runtime.isCompromised ? "var(--red)" : "var(--text-3)";

  const metricCards = [
    {
      label: "ATTACK ATTEMPTS",
      value: runtime.attackAttempts ?? 0,
      suffix: "",
      color: "var(--text-1)",
      caption: "How many poisoned submissions were sent to the local target.",
    },
    {
      label: "ACCEPTED / REJECTED",
      value: `${runtime.acceptedReadings ?? 0}/${runtime.rejectedReadings ?? 0}`,
      suffix: "",
      color: runtime.isCompromised ? "var(--red)" : "var(--green)",
      caption: runtime.isCompromised
        ? "Accepted poison means the first gate failed."
        : protectedMode
          ? "Rejected poison means the defense gate is working."
          : "No poisoned reading has been accepted yet.",
    },
    {
      label: "CONGESTION SCORE",
      value: runtime.congestionScore ?? "n/a",
      suffix: "",
      color: scoreColor,
      caption: runtime.isCompromised
        ? "Negative traffic produces a negative model feature."
        : "Run the attack to generate the feature.",
    },
    {
      label: "DEFENSE COVERAGE",
      value: `${runtime.defenseCoverage ?? 0}/3`,
      suffix: "",
      color: protectedMode ? "var(--green)" : "var(--orange)",
      caption: "Layers covered: sanity checks, anomaly detection, drift gate.",
    },
    {
      label: "DOWNSTREAM RISK",
      value: runtime.driftScore,
      suffix: "%",
      color: driftColor,
      caption: runtime.isCompromised
        ? "Above the 25% safety threshold used in this lab."
        : protectedMode
          ? "Risk drops once poisoned data is rejected."
          : "Below the safety threshold before the attack.",
    },
    {
      label: "MODEL TRUST",
      value: runtime.accuracy,
      suffix: "%",
      color: accuracyColor,
      caption: runtime.isCompromised
        ? "Trust drops because poisoned data reached downstream logic."
        : "Baseline trust before poisoned input is accepted.",
    },
  ];

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
      {/* Estado general */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: "10px",
          border: `1px solid ${runtime.isCompromised ? "rgba(248,113,113,0.28)" : "var(--green-border)"}`,
          background: runtime.isCompromised
            ? "rgba(248,113,113,0.08)"
            : "var(--green-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.1em",
              marginBottom: "4px",
            }}
          >
            LOCAL LAB STATUS
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-1)",
              lineHeight: 1.5,
            }}
          >
            {runtime.lastEvent}
            {runtime.lastReason && (
              <span style={{ color: "var(--text-3)" }}>
                {" "}
                {runtime.lastReason}
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: "10px",
            padding: "3px 10px",
            borderRadius: "999px",
            border: `1px solid ${statusColor}`,
            color: statusColor,
            fontWeight: 600,
            whiteSpace: "nowrap",
            marginLeft: "12px",
          }}
        >
          {runtime.isCompromised
            ? "COMPROMISED"
            : protectedMode
              ? "PROTECTED"
              : "VULNERABLE"}
        </span>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: "8px",
              padding: "15px",
              minHeight: "132px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-3)",
                letterSpacing: "0.08em",
                lineHeight: 1.4,
              }}
            >
              {metric.label}
            </div>
            <div
              style={{
                fontSize: "30px",
                color: metric.color,
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
              }}
            >
              {metric.value}
              {metric.suffix && (
                <span style={{ fontSize: "15px" }}>{metric.suffix}</span>
              )}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-3)",
                lineHeight: 1.5,
              }}
            >
              {metric.caption}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: "8px",
          border: "1px solid var(--border-dim)",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-3)",
            letterSpacing: "0.1em",
            marginBottom: "8px",
          }}
        >
          WHAT THESE METRICS MEAN
        </div>
        <div
          style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.7 }}
        >
          These are lab indicators, not production telemetry. They show whether
          the local app accepted or rejected poisoned data. The target starts in
          vulnerable mode, then switches to protected mode after
          enable_defense.py.
        </div>
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: "8px",
          border: "1px solid var(--orange-border)",
          background: "rgba(249,115,22,0.06)",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--orange)",
            letterSpacing: "0.1em",
            marginBottom: "8px",
          }}
        >
          ATTACK COMMAND
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-2)",
            lineHeight: 1.7,
            fontFamily: "var(--font-mono)",
          }}
        >
          curl http://127.0.0.1:5000/health{"\n"}
          python3 /home/lab/Desktop/Lab1/poison_data.py{"\n"}
          python3 /home/lab/Desktop/Lab1/enable_defense.py{"\n"}
          python3 /home/lab/Desktop/Lab1/poison_data.py
        </div>
      </div>
    </div>
  );
}

function QuizTab({ item, phase, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [tutorFeedback, setTutorFeedback] = useState("");
  const [docLinks, setDocLinks] = useState([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState("");

  const feedbackRef = useRef(null);

  const quiz = Array.isArray(item?.quiz) ? item.quiz : [];

  const answeredCount = quiz.filter((_, i) =>
    Object.prototype.hasOwnProperty.call(answers, i)
  ).length;

  const allAnswered = quiz.length > 0 && answeredCount === quiz.length;

  const correctCount = quiz.filter(
    (q, i) => answers[i] === q.correctAnswerIndex
  ).length;

  const scoreRatio = quiz.length > 0 ? correctCount / quiz.length : 0;

  function getOptions(question) {
    if (Array.isArray(question?.options)) return question.options;
    if (Array.isArray(question?.choices)) return question.choices;
    if (Array.isArray(question?.answers)) return question.answers;
    return [];
  }

  function selectAnswer(questionIndex, optionIndex) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  }

  async function handleSubmit() {
    if (!allAnswered) return;

    setSubmitted(true);

    if (scoreRatio >= 0.75) {
      onComplete?.(item.id);
    }

    setTutorLoading(true);
    setTutorError("");
    setTutorFeedback("");
    setDocLinks([]);

    const wrongAnswers = quiz
      .map((question, index) => {
        const options = getOptions(question);
        const selectedIndex = answers[index];

        if (selectedIndex === question.correctAnswerIndex) return null;

        return {
          question: question.question,
          student_answer: options[selectedIndex] ?? "No answer",
          correct_answer: options[question.correctAnswerIndex] ?? "Unknown",
          explanation: question.explanation ?? null,
        };
      })
      .filter(Boolean);

    try {
      const data = await request("/api/rag/quiz-feedback", {
        method: "POST",
        body: JSON.stringify({
          lab_id: item.id,
          phase: phase || "Cybersecurity lab",
          score: correctCount,
          total: quiz.length,
          wrong_answers: wrongAnswers,
        }),
      });

      console.log("QUIZ FEEDBACK RESPONSE:", data);

      setTutorFeedback(data?.feedback ?? "");
      setDocLinks(Array.isArray(data?.doc_links) ? data.doc_links : []);

      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    } catch (err) {
      console.error("QUIZ FEEDBACK ERROR:", err);
      setTutorError(`Tutor feedback unavailable: ${err.message}`);

      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    } finally {
      setTutorLoading(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setTutorFeedback("");
    setTutorError("");
    setDocLinks([]);
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
        No questions are configured for this lab.
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* ── Header bar with score + submit/retry ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 14px",
          background: "var(--bg-elevated)",
          borderRadius: "8px",
          border: "1px solid var(--border-dim)",
          position: "sticky",
          top: 0,
          zIndex: 5,
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
              : `${answeredCount}/${quiz.length}`}
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.08em",
            }}
          >
            {submitted ? "correct" : "answered"}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            height: "4px",
            background: "var(--bg-surface)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: submitted
                ? `${Math.round(scoreRatio * 100)}%`
                : `${Math.round((answeredCount / quiz.length) * 100)}%`,
              background: submitted
                ? scoreRatio >= 0.75
                  ? "var(--green)"
                  : "var(--orange)"
                : "var(--orange)",
              transition: "width 0.25s ease",
            }}
          />
        </div>

        {!submitted ? (
          <button
            type="button"
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
              fontFamily: "var(--font-mono)",
              cursor: allAnswered ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            SUBMIT
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-dim)",
              background: "transparent",
              color: "var(--text-2)",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            RETRY
          </button>
        )}
      </div>

      {/* ── Tutor feedback block: AHORA VA ARRIBA, no enterrado al final ── */}
      {submitted && (
        <div
          ref={feedbackRef}
          style={{
            border: "1px solid var(--border-dim)",
            borderRadius: "10px",
            overflow: "hidden",
            flexShrink: 0,
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
                background: tutorFeedback
                  ? "var(--green)"
                  : tutorLoading
                    ? "var(--orange)"
                    : tutorError
                      ? "var(--red)"
                      : "var(--text-3)",
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
              TUTOR — Personalized feedback
            </span>

            <span
              style={{
                marginLeft: "auto",
                fontSize: "10px",
                color: scoreRatio >= 0.75 ? "var(--green)" : "var(--orange)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {Math.round(scoreRatio * 100)}% —{" "}
              {scoreRatio >= 0.75 ? "PASSED" : "REVIEW NEEDED"}
            </span>
          </div>

          <div style={{ padding: "14px 16px", minHeight: "80px" }}>
            {tutorLoading && (
              <div
                style={{
                  color: "var(--text-3)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Analyzing your answers...
              </div>
            )}

            {tutorError && (
              <div
                style={{
                  color: "var(--red)",
                  fontSize: "12px",
                  lineHeight: 1.6,
                }}
              >
                {tutorError}
              </div>
            )}

            {tutorFeedback && (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-1)",
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                }}
              >
                {tutorFeedback}
              </div>
            )}
          </div>

          {docLinks.length > 0 && (
            <div style={{ padding: "0 16px 14px" }}>
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--text-3)",
                  letterSpacing: "0.12em",
                  marginBottom: "8px",
                }}
              >
                FURTHER READING
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {docLinks.map((link) => (
                  <a
                    key={link.path}
                    href={link.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "var(--bg-base)",
                      border: "1px solid var(--border-dim)",
                      color: "var(--blue)",
                      textDecoration: "none",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span style={{ fontSize: "10px", opacity: 0.6 }}>◈</span>
                    {link.title}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "9px",
                        color: "var(--text-3)",
                      }}
                    >
                      docs →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Questions ── */}
      {quiz.map((question, questionIndex) => {
        const options = getOptions(question);
        const selectedAnswer = answers[questionIndex];

        return (
          <section
            key={`${question.question}-${questionIndex}`}
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: "10px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border-dim)",
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-1)",
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                {questionIndex + 1}. {question.question}
              </div>

              {submitted && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "12px",
                    flexShrink: 0,
                    background:
                      selectedAnswer === question.correctAnswerIndex
                        ? "var(--green-dim)"
                        : "var(--red-dim)",
                    color:
                      selectedAnswer === question.correctAnswerIndex
                        ? "var(--green)"
                        : "var(--red)",
                    border:
                      selectedAnswer === question.correctAnswerIndex
                        ? "1px solid var(--green-border)"
                        : "1px solid rgba(248,113,113,0.28)",
                  }}
                >
                  {selectedAnswer === question.correctAnswerIndex
                    ? "CORRECT"
                    : "WRONG"}
                </span>
              )}
            </div>

            <div
              style={{
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {options.map((option, optionIndex) => {
                const isSelected = selectedAnswer === optionIndex;
                const isCorrect = optionIndex === question.correctAnswerIndex;

                let background = "var(--bg-base)";
                let border = "var(--border-dim)";
                let color = "var(--text-2)";

                if (!submitted && isSelected) {
                  background = "var(--orange-dim)";
                  border = "var(--orange-border)";
                  color = "var(--text-1)";
                }

                if (submitted && isCorrect) {
                  background = "var(--green-dim)";
                  border = "var(--green-border)";
                  color = "var(--green)";
                }

                if (submitted && isSelected && !isCorrect) {
                  background = "var(--red-dim)";
                  border = "rgba(248,113,113,0.28)";
                  color = "var(--red)";
                }

                return (
                  <button
                    key={`${questionIndex}-${optionIndex}`}
                    type="button"
                    onClick={() => selectAnswer(questionIndex, optionIndex)}
                    disabled={submitted}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: "7px",
                      border: `1px solid ${border}`,
                      background,
                      color,
                      fontSize: "11px",
                      lineHeight: 1.5,
                      cursor: submitted ? "default" : "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "999px",
                        border: `1px solid ${
                          isSelected ? "var(--orange)" : "var(--border-mid)"
                        }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "9px",
                        color: isSelected
                          ? "var(--orange)"
                          : "var(--text-3)",
                      }}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>

                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {submitted && question.explanation && (
              <div
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid var(--border-dim)",
                  background: "rgba(56,189,248,0.04)",
                  fontSize: "11px",
                  color: "var(--text-2)",
                  lineHeight: 1.6,
                }}
              >
                {question.explanation}
              </div>
            )}
          </section>
        );
      })}
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
  onCompleteLabQuiz,
  onViewScenario,
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

  const quizUnlocked = Boolean(item?.guideCompleted);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <section
        ref={containerRef}
        style={{
          display: "grid",
          gridTemplateColumns: `1fr 12px ${rightWidth}px`,
          flex: 1,
          overflow: "hidden",
          background: "var(--bg-base)",
          gap: 0,
          minHeight: 0,
        }}
      >
        {/* ── LEFT: VM always visible ─────────────────────────────────────── */}
        <div
          style={{ minWidth: 0, minHeight: 0, padding: "14px 8px 14px 14px" }}
        >
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
          {onViewScenario && (
            <button
              onClick={onViewScenario}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                border: "none",
                borderBottom: "1px solid var(--border-dim)",
                background: "rgba(56,189,248,0.05)",
                color: "var(--blue)",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: "11px" }}>◆</span>
              VIEW PIPELINE
            </button>
          )}
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
              <LabGuide
                item={item}
                currentStep={currentStep}
                currentAnswer={currentAnswer}
                onAnswerChange={onAnswerChange}
                onPrevStep={onPrevStep}
                onNextStep={onNextStep}
              />
            )}
            {activeTab === "logs" && (
              <RuntimeLogsPanel
                lines={logs}
                statusLabel={runtime.statusLabel}
              />
            )}
            {activeTab === "metrics" && (
              <MetricsTab
                runtime={runtime}
                onAttack={triggerAttack}
                attackLoading={attackLoading}
              />
            )}
            {activeTab === "quiz" && quizUnlocked && (
              <QuizTab
                item={item}
                phase={item?.phase}
                onComplete={onCompleteLabQuiz}
              />
            )}
          </div>
        </aside>
      </section>
    </div>
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

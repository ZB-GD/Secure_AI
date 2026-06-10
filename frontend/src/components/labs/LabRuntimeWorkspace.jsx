import { useState, useRef, useEffect } from "react";
import RemoteDesktopPanel from "../workspace/RemoteDesktopPanel";
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
function TabBar({ activeTab, onSelect, quizUnlocked, onReset, resetLoading }) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-panel)",
        flexShrink: 0,
        alignItems: "stretch",
      }}
    >
      {TABS.filter((tab) => tab.id !== "quiz" || quizUnlocked).map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              flex: 1,
              padding: "11px 8px",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--orange)"
                : "2px solid transparent",
              background: isActive ? "var(--bg-elevated)" : "transparent",
              color: isActive ? "var(--text-1)" : "var(--text-3)",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {tab.label.toUpperCase()}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onReset}
        disabled={resetLoading}
        title="Reset lab to initial state"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "0 12px",
          border: "none",
          borderLeft: "1px solid var(--border-dim)",
          background: "transparent",
          color: resetLoading ? "var(--text-3)" : "var(--text-2)",
          fontSize: "12px",
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          cursor: resetLoading ? "not-allowed" : "pointer",
          flexShrink: 0,
          opacity: resetLoading ? 0.5 : 1,
          letterSpacing: "0.05em",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        {resetLoading ? "..." : "RESET"}
      </button>
    </div>
  );
}

// ─── Sub-component: shared pill-style action button (icon + label) ──────────
function PillButton({ onClick, color, background, border, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "8px 14px",
        borderRadius: "6px",
        border: `1px solid ${border}`,
        background,
        color,
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        cursor: "pointer",
        letterSpacing: "0.05em",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const RETRY_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const REVIEW_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const FINISH_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function QuizTab({ item, phase, onComplete, onSelectItem }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [tutorFeedback, setTutorFeedback] = useState("");
  const [docLinks, setDocLinks] = useState([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [confirmRetry, setConfirmRetry] = useState(false);

  const quiz = Array.isArray(item?.quiz) ? item.quiz : [];
  const question = quiz[currentQ];
  const isLast = currentQ === quiz.length - 1;

  const answeredCount = quiz.filter((_, i) =>
    Object.prototype.hasOwnProperty.call(answers, i),
  ).length;
  const allAnswered = quiz.length > 0 && answeredCount === quiz.length;
  const correctCount = quiz.filter(
    (q, i) => answers[i] === q.correctAnswerIndex,
  ).length;
  const scoreRatio = quiz.length > 0 ? correctCount / quiz.length : 0;

  function getOptions(q) {
    if (Array.isArray(q?.options)) return q.options;
    if (Array.isArray(q?.choices)) return q.choices;
    if (Array.isArray(q?.answers)) return q.answers;
    return [];
  }

  function selectAnswer(optionIndex) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [currentQ]: optionIndex }));
  }

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitted(true);
    setShowFeedback(true);

    if (scoreRatio >= 0.75) {
      onComplete?.(item.id, {
        score: {
          correct: correctCount,
          total: quiz.length,
          percent: Math.round(scoreRatio * 100),
        },
      });
    }

    setTutorLoading(true);
    setTutorError("");
    setTutorFeedback("");
    setDocLinks([]);

    const wrongAnswers = quiz
      .map((q, index) => {
        const opts = getOptions(q);
        const selectedIndex = answers[index];
        if (selectedIndex === q.correctAnswerIndex) return null;
        return {
          question: q.question,
          student_answer: opts[selectedIndex] ?? "No answer",
          correct_answer: opts[q.correctAnswerIndex] ?? "Unknown",
          explanation: q.explanation ?? null,
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
      setTutorFeedback(data?.feedback ?? "");
      setDocLinks(Array.isArray(data?.doc_links) ? data.doc_links : []);
    } catch (err) {
      setTutorError(`Tutor feedback unavailable: ${err.message}`);
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
    setCurrentQ(0);
    setShowFeedback(false);
    setConfirmRetry(false);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Enter" || submitted || showFeedback) return;
      if (isLast) {
        if (allAnswered) handleSubmit();
      } else if (answers[currentQ] !== undefined) {
        setCurrentQ((q) => Math.min(quiz.length - 1, q + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submitted, showFeedback, isLast, allAnswered, currentQ, quiz.length, answers]);

  if (quiz.length === 0) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-3)", fontSize: "14px" }}>
        No questions are configured for this lab.
      </div>
    );
  }

  const options = getOptions(question);
  const selectedAnswer = answers[currentQ];

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Progress header ── */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {quiz.map((_, i) => {
          let bg = "var(--border-mid)";
          if (answers[i] !== undefined && !submitted) bg = "var(--orange)";
          if (submitted) bg = answers[i] === quiz[i].correctAnswerIndex ? "var(--green)" : "var(--red)";
          if (!submitted && i === currentQ) bg = "var(--text-2)";
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentQ(i)}
              style={{ width: "8px", height: "8px", borderRadius: "50%", background: bg, border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
            />
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: "14px", color: "var(--text-3)", fontFamily: "var(--font-display)" }}>
          {currentQ + 1} / {quiz.length}
        </span>
        {submitted && (
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--orange-border)", background: "var(--orange-dim)", color: "var(--orange)", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-display)", cursor: "pointer" }}
          >
            Tutor Feedback
          </button>
        )}
      </div>

      {/* ── Question + options ── */}
      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.65, fontWeight: 600, fontFamily: "var(--font-display)", flex: 1 }}>
            {question.question}
          </div>
          {submitted && (
            <span style={{
              fontSize: "14px", fontWeight: 700, padding: "4px 12px", borderRadius: "6px", flexShrink: 0,
              background: selectedAnswer === question.correctAnswerIndex ? "rgba(34,197,94,0.18)" : "rgba(248,113,113,0.18)",
              color: selectedAnswer === question.correctAnswerIndex ? "#4ade80" : "#f87171",
              border: selectedAnswer === question.correctAnswerIndex ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(248,113,113,0.45)",
            }}>
              {selectedAnswer === question.correctAnswerIndex ? "✓ CORRECT" : "✗ WRONG"}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {options.map((option, optionIndex) => {
            const isSelected = selectedAnswer === optionIndex;
            const isCorrect = optionIndex === question.correctAnswerIndex;
            let background = "var(--bg-base)";
            let border = "var(--border-dim)";
            let color = "var(--text-2)";
            if (!submitted && isSelected) { background = "var(--orange-dim)"; border = "var(--orange-border)"; color = "var(--text-1)"; }
            if (submitted && isCorrect) { background = "var(--green-dim)"; border = "var(--green-border)"; color = "var(--green)"; }
            if (submitted && isSelected && !isCorrect) { background = "var(--red-dim)"; border = "rgba(248,113,113,0.28)"; color = "var(--red)"; }
            return (
              <button
                key={optionIndex}
                type="button"
                onClick={() => selectAnswer(optionIndex)}
                disabled={submitted}
                style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "10px", textAlign: "left", padding: "10px 12px", borderRadius: "7px", border: `1px solid ${border}`, background, color, fontSize: "14px", lineHeight: 1.55, fontFamily: "var(--font-display)", cursor: submitted ? "default" : "pointer" }}
              >
                <span style={{ width: "20px", height: "20px", borderRadius: "999px", border: `1px solid ${isSelected ? "var(--orange)" : "var(--border-mid)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px", color: isSelected ? "var(--orange)" : "var(--text-3)" }}>
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {submitted && question.explanation && (
          <div style={{ padding: "10px 14px", borderRadius: "7px", border: "1px solid var(--border-dim)", background: "rgba(56,189,248,0.04)", fontSize: "14px", color: "var(--text-2)", lineHeight: 1.65 }}>
            {question.explanation}
          </div>
        )}
      </div>

      {/* ── Navigation footer ── */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
          disabled={currentQ === 0}
          style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--border-dim)", background: "transparent", color: currentQ === 0 ? "var(--text-3)" : "var(--text-2)", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-display)", cursor: currentQ === 0 ? "not-allowed" : "pointer", opacity: currentQ === 0 ? 0.4 : 1, display: "flex", alignItems: "center", gap: "6px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="15 18 9 12 15 6"/></svg> PREV
        </button>
        <div style={{ flex: 1 }} />
        {!submitted ? (
          isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered}
              style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: allAnswered ? "var(--orange)" : "var(--bg-surface)", color: allAnswered ? "#fff" : "var(--text-3)", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-display)", cursor: allAnswered ? "pointer" : "not-allowed" }}
            >
              SUBMIT
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentQ((q) => Math.min(quiz.length - 1, q + 1))}
              style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--border-dim)", background: "transparent", color: "var(--text-2)", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-display)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              NEXT <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )
        ) : confirmRetry ? (
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" onClick={reset} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--red)", background: "var(--red-dim)", color: "var(--red)", fontSize: "14px", fontFamily: "var(--font-display)", cursor: "pointer" }}>YES, RETRY</button>
            <button type="button" onClick={() => setConfirmRetry(false)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-dim)", background: "transparent", color: "var(--text-3)", fontSize: "14px", fontFamily: "var(--font-display)", cursor: "pointer" }}>CANCEL</button>
          </div>
        ) : (
          <button type="button" onClick={() => (item?.completed ? setConfirmRetry(true) : reset())} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-dim)", background: "transparent", color: "var(--text-2)", fontSize: "14px", fontFamily: "var(--font-display)", cursor: "pointer" }}>
            RETRY
          </button>
        )}
      </div>

      {/* ── Tutor feedback overlay ── */}
      {showFeedback && (
        <div style={{ position: "absolute", inset: 0, background: "var(--bg-panel)", zIndex: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, background: "var(--bg-elevated)" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: tutorFeedback ? "var(--green)" : tutorLoading ? "var(--orange)" : tutorError ? "var(--red)" : "var(--text-3)" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-display)" }}>TUTOR FEEDBACK</span>
            <span style={{ marginLeft: "auto", fontSize: "14px", color: scoreRatio >= 0.75 ? "var(--green)" : "var(--orange)", fontFamily: "var(--font-display)" }}>
              {correctCount}/{quiz.length} — {scoreRatio >= 0.75 ? "PASSED" : "REVIEW NEEDED"}
            </span>
            <button type="button" onClick={() => setShowFeedback(false)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--border-dim)", background: "transparent", color: "var(--text-3)", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {tutorLoading && (
              <div style={{ color: "var(--text-3)", fontSize: "14px", fontFamily: "var(--font-display)" }}>Analyzing your answers...</div>
            )}
            {tutorError && (
              <div style={{ color: "var(--red)", fontSize: "14px", lineHeight: 1.6 }}>{tutorError}</div>
            )}
            {tutorFeedback && (
              <div style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{tutorFeedback}</div>
            )}
            {docLinks.length > 0 && (
              <div>
                <div style={{ fontSize: "14px", color: "var(--text-3)", marginBottom: "8px" }}>FURTHER READING</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {docLinks.map((link) => (
                    <button key={link.path} type="button" onClick={() => { setShowFeedback(false); onSelectItem?.({ id: "docs", type: "docs", docId: link.path, docPath: link.path }); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", background: "var(--bg-base)", border: "1px solid var(--border-dim)", color: "var(--blue)", fontSize: "14px", fontFamily: "var(--font-display)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                      <span style={{ opacity: 0.6 }}>◈</span>
                      {link.title}
                      <span style={{ marginLeft: "auto", fontSize: "14px", color: "var(--text-3)" }}>
                        docs <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="9 18 15 12 9 6"/></svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-dim)", display: "flex", justifyContent: "flex-end", gap: "8px", flexShrink: 0 }}>
            <PillButton
              onClick={() => setShowFeedback(false)}
              color="var(--text-2)"
              background="transparent"
              border="var(--border-dim)"
              icon={REVIEW_ICON}
              label="REVIEW ANSWERS"
            />
            <PillButton
              onClick={reset}
              color="var(--text-2)"
              background="transparent"
              border="var(--border-dim)"
              icon={RETRY_ICON}
              label="RETRY"
            />
            {scoreRatio >= 0.75 && (
              <PillButton
                onClick={() => onSelectItem?.("dashboard")}
                color="var(--green)"
                background="var(--green-dim)"
                border="var(--green-border)"
                icon={FINISH_ICON}
                label="FINISH"
              />
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
  onCompleteLabQuiz,
  onSelectItem,
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

  const { remoteUrl, remoteLoading, remoteError, retryRuntime, resetLab, resetLoading, runtime, logs } =
    useLabRuntime(item?.id, {
      autoStart: true,
      pollIntervalMs: 3000,
      logPollIntervalMs: 1200,
      logLimit: 200,
    });

  const quizUnlocked = Boolean(item?.guideCompleted);

  const previousGuideCompleted = useRef(Boolean(item?.guideCompleted));

  useEffect(() => {
    const isNowCompleted = Boolean(item?.guideCompleted);

    if (!previousGuideCompleted.current && isNowCompleted) {
      setActiveTab("quiz");
    }

    previousGuideCompleted.current = isNowCompleted;
  }, [item?.guideCompleted]);

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
          <TabBar
            activeTab={activeTab}
            onSelect={setActiveTab}
            quizUnlocked={quizUnlocked}
            onReset={resetLab}
            resetLoading={resetLoading}
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
                onUnlockQuiz={() => setActiveTab("quiz")}
              />
            )}
            {activeTab === "logs" && (
              <RuntimeLogsPanel
                lines={logs}
                statusLabel={runtime.statusLabel}
              />
            )}
            {activeTab === "metrics" && <LabMetrics runtime={runtime} />}
            {activeTab === "quiz" && quizUnlocked && (
              <QuizTab
                item={item}
                phase={item?.phase}
                onComplete={onCompleteLabQuiz}
                onSelectItem={onSelectItem}
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

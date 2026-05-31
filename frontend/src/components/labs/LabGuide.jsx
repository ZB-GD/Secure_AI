import { useEffect, useRef, useState } from "react";
import { request } from "../../services/apiClient";
import { labService } from "../../services/labService";

function isValid(step, answer) {
  if (!step) return false;
  const value = (answer || "").toLowerCase().trim();
  if (!value) return false;
  return (step.expectedKeywords || []).some(
    (kw) => value === kw.toLowerCase().trim(),
  );
}

function CommandBlock({ command, labId }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  async function sendToTerminal() {
    if (state === "sending") return;
    setState("sending");
    try {
      await labService.injectCommandById(labId, command);
      setState("sent");
    } catch {
      setState("error");
    } finally {
      window.setTimeout(() => setState("idle"), 1800);
    }
  }

  const label = {
    idle: "COPY",
    sending: "COPYING",
    sent: "COPIED",
    error: "ERROR",
  }[state];
  const color = {
    idle: "var(--text-2)",
    sending: "var(--text-3)",
    sent: "var(--green)",
    error: "var(--red)",
  }[state];
  const bg = {
    idle: "var(--bg-base)",
    sending: "var(--bg-base)",
    sent: "var(--green-dim)",
    error: "var(--red-dim)",
  }[state];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "stretch",
        gap: "8px",
        margin: "10px 0",
      }}
    >
      <pre
        style={{
          margin: 0,
          overflowX: "auto",
          whiteSpace: "pre",
          background: "#05080f",
          border: "1px solid rgba(56,189,248,0.24)",
          borderRadius: "7px",
          padding: "11px 12px",
          color: "var(--green)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        <code>{command}</code>
      </pre>

      <button
        type="button"
        onClick={sendToTerminal}
        title="Send command to the VM terminal"
        disabled={state === "sending"}
        style={{
          minWidth: "62px",
          border: "1px solid var(--border-mid)",
          borderRadius: "7px",
          background: bg,
          color,
          fontFamily: "var(--font-display)",
          fontSize: "12px",
          fontWeight: 700,
          cursor: state === "sending" ? "wait" : "pointer",
        }}
      >
        {label}
      </button>
    </div>
  );
}

const FILE_EXTS =
  "py|sh|txt|json|yml|yaml|csv|log|db|sql|html|js|jsx|conf|env|md";
const HIGHLIGHT_RE = new RegExp(
  `(/[\\w./\\-]+|[\\w.\\-]+\\.(?:${FILE_EXTS})\\b|:\\d{2,5}\\b|-?\\b\\d{4,}\\b)`,
  "g",
);

function highlightInline(text) {
  const parts = [];
  let lastIndex = 0;
  let match;
  HIGHLIGHT_RE.lastIndex = 0;

  while ((match = HIGHLIGHT_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span
        key={match.index}
        style={{
          color: "var(--text-1)",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
        }}
      >
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

function InstructionText({ text, labId }) {
  const blocks = [];
  let paragraph = [];
  let commandLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushCommands() {
    if (!commandLines.length) return;
    blocks.push({ type: "commands", lines: commandLines });
    commandLines = [];
  }

  for (const rawLine of (text || "").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushCommands();
      continue;
    }

    if (
      /^(curl|cat|python3?|gedit|ls|sudo|chmod|cd|nano|vim|vi|grep|touch|mkdir|rm|cp|mv|echo|bash|sh|pip3?|apt(?:-get)?|systemctl|docker|git)\s+/.test(
        line,
      )
    ) {
      flushParagraph();
      commandLines.push(line);
      continue;
    }

    flushCommands();
    paragraph.push(line);
  }

  flushParagraph();
  flushCommands();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {blocks.map((block, index) => {
        if (block.type === "commands") {
          return (
            <div key={index}>
              {block.lines.map((line) => (
                <CommandBlock key={line} command={line} labId={labId} />
              ))}
            </div>
          );
        }

        return (
          <p
            key={index}
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: "1.7",
              color: "var(--text-2)",
            }}
          >
            {highlightInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

export default function LabGuide({
  item,
  currentStep,
  currentAnswer,
  onAnswerChange,
  onPrevStep,
  onNextStep,
  onUnlockQuiz,
}) {
  const [showHint, setShowHint] = useState(false);
  const [answerTouched, setAnswerTouched] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorAnswer, setTutorAnswer] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const contentScrollRef = useRef(null);

  // UX: scroll to top and reset local state on every step change
  useEffect(() => {
    setShowHint(false);
    setAnswerTouched(false);
    setTutorOpen(false);
    setTutorQuestion(currentStep?.title || "");
    setTutorAnswer("");
    setTutorError("");
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep?.id, currentStep?.title]);

  if (!item || !item.guide || !item.guide.steps || !currentStep) {
    return (
      <div style={{ padding: "24px", color: "var(--text-3)" }}>
        Loading guide...
      </div>
    );
  }

  const totalSteps = item.guide.steps.length;
  const stepIndex = item.currentStepIndex;
  const isLastStep = stepIndex === totalSteps - 1;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const answerValid = isValid(currentStep, currentAnswer);

  async function askTutor() {
    const message = tutorQuestion.trim() || currentStep.title;
    setTutorLoading(true);
    setTutorError("");
    setTutorAnswer("");

    try {
      const data = await request("/api/rag/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `Guide step: ${currentStep.title}\nStudent question: ${message}`,
          context: `${item.title} - ${currentStep.title}`,
        }),
      });
      setTutorAnswer(data.response || "");
    } catch (error) {
      setTutorError(error?.message || "Unable to contact tutor.");
    } finally {
      setTutorLoading(false);
    }
  }

  const handleNext = () => {
    if (!answerValid) {
      setAnswerTouched(true);
      return;
    }

    setShowHint(false);
    setAnswerTouched(false);
    onNextStep();

    if (isLastStep) {
      onUnlockQuiz?.();
    }
  };

  const handlePrev = () => {
    setShowHint(false);
    onPrevStep();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-panel)",
      }}
    >
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "var(--text-1)",
              fontFamily: "var(--font-display)",
            }}
          >
            {currentStep?.title || item.title}
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--text-3)",
              fontFamily: "var(--font-display)",
              flexShrink: 0,
            }}
          >
            {stepIndex + 1} / {totalSteps}
          </div>
        </div>

        <div
          style={{
            height: "3px",
            background: "var(--bg-surface)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "var(--orange)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      <div
        ref={contentScrollRef}
        style={{
          flex: 1,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          overflowY: "auto",
        }}
      >
        <InstructionText text={currentStep.body} labId={item.id} />

        {currentStep.observation && (
          <div
            style={{
              background: "rgba(249,115,22,0.05)",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid var(--orange-border)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "var(--orange)",
                marginBottom: "8px",
              }}
            >
              OBSERVATION
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: "1.7",
                color: "var(--text-2)",
              }}
            >
              {currentStep.observation}
            </p>
          </div>
        )}

        {currentStep.hint && (
          <div>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                background: "transparent",
                border: "1px solid rgba(251,191,36,0.35)",
                color: "#fbbf24",
                fontSize: "14px",
                padding: "6px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {showHint ? "✕ HIDE HINT" : "💡 SHOW HINT"}
            </button>

            {showHint && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "12px",
                  background: "rgba(251,191,36,0.05)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#fbbf24",
                  lineHeight: 1.65,
                }}
              >
                {currentStep.hint}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            border: "1px solid rgba(56,189,248,0.22)",
            borderRadius: "8px",
            background: "rgba(56,189,248,0.04)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTutorOpen((open) => !open);
              if (!tutorQuestion) setTutorQuestion(currentStep.title);
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              border: "none",
              background: "transparent",
              color: "var(--blue)",
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <span>ASK TUTOR</span>
            <span>{tutorOpen ? "HIDE" : "OPEN"}</span>
          </button>

          {tutorOpen && (
            <div
              style={{
                borderTop: "1px solid rgba(56,189,248,0.16)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <textarea
                value={tutorQuestion}
                onChange={(event) => setTutorQuestion(event.target.value)}
                rows={3}
                style={{
                  resize: "vertical",
                  width: "100%",
                  border: "1px solid var(--border-mid)",
                  borderRadius: "6px",
                  background: "var(--bg-base)",
                  color: "var(--text-1)",
                  padding: "10px 12px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  outline: "none",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={askTutor}
                  disabled={tutorLoading}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(56,189,248,0.28)",
                    background: tutorLoading
                      ? "var(--bg-surface)"
                      : "rgba(56,189,248,0.10)",
                    color: "var(--blue)",
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: tutorLoading ? "wait" : "pointer",
                  }}
                >
                  {tutorLoading ? "ASKING..." : "SEND"}
                </button>
              </div>
              {tutorError && (
                <div style={{ color: "var(--red)", fontSize: "14px" }}>
                  {tutorError}
                </div>
              )}
              {tutorAnswer && (
                <div
                  style={{
                    color: "var(--text-2)",
                    fontSize: "14px",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {tutorAnswer}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: "4px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "var(--text-1)",
              fontWeight: "600",
              lineHeight: "1.6",
              marginBottom: "12px",
            }}
          >
            {currentStep.question}
          </div>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => {
                setAnswerTouched(false);
                onAnswerChange(currentStep.id, e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;

                e.preventDefault();

                if (!answerValid) {
                  setAnswerTouched(true);
                  return;
                }

                handleNext();
              }}
              onBlur={() => {
                if ((currentAnswer || "").trim()) {
                  setAnswerTouched(true);
                }
              }}
              placeholder={currentStep.placeholder}
              style={{
                width: "100%",
                background: "var(--bg-base)",
                border: `1px solid ${
                  answerValid
                    ? "var(--green)"
                    : answerTouched && currentAnswer
                      ? "var(--red)"
                      : "var(--border-mid)"
                }`,
                borderRadius: "6px",
                padding: "12px 14px",
                fontSize: "14px",
                color: "var(--text-1)",
                outline: "none",
                transition: "all 0.2s",
              }}
            />

            {answerValid && (
              <span
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "12px",
                  color: "var(--green)",
                  fontSize: "14px",
                }}
              >
                ✓ Correct
              </span>
            )}
          </div>

          {answerTouched && !!currentAnswer && !answerValid && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "14px",
                color: "var(--red)",
              }}
            >
              Incorrect answer.
              {currentStep.placeholder
                ? ` Try: ${currentStep.placeholder}`
                : " Review your workspace and try again."}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "16px 24px",
          borderTop: "1px solid var(--border-dim)",
          background: "var(--bg-elevated)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={handlePrev}
          disabled={stepIndex === 0}
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            padding: "10px 16px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border-mid)",
            color: stepIndex === 0 ? "var(--text-3)" : "var(--text-1)",
            opacity: stepIndex === 0 ? 0.3 : 1,
            cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="15 18 9 12 15 6"/></svg> PREVIOUS
        </button>

        <button
          onClick={handleNext}
          disabled={!answerValid}
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            padding: "10px 24px",
            borderRadius: "6px",
            background: answerValid ? "var(--green)" : "var(--orange)",
            border: "none",
            color: "#fff",
            cursor: answerValid ? "pointer" : "not-allowed",
            opacity: answerValid ? 1 : 0.65,
            fontWeight: "600",
            fontSize: "14px",
            boxShadow: answerValid
              ? "0 0 15px rgba(34,197,94,0.3)"
              : "0 0 15px rgba(249,115,22,0.15)",
          }}
        >
          {isLastStep ? "UNLOCK QUIZ" : <>NEXT <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="9 18 15 12 9 6"/></svg></>}
        </button>
      </div>
    </div>
  );
}

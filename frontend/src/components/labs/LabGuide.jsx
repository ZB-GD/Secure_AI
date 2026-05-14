import { useEffect, useState } from "react"
import { request } from "../../services/apiClient"

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isValid(step, answer) {
  if (!step) return false

  const value = (answer || "").toLowerCase().trim()
  if (!value) return false

  return (step.expectedKeywords || []).some((kw) => {
    const keyword = kw.toLowerCase().trim()

    // For phrases, allow plain text matching.
    if (keyword.includes(" ")) {
      return value.includes(keyword)
    }

    // Si es una sola palabra, exigimos palabra completa
    const regex = new RegExp(`(^|\\b)${escapeRegExp(keyword)}(\\b|$)`, "i")
    return regex.test(value)
  })
}

function CommandBlock({ command }) {
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

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
        onClick={copyCommand}
        title="Copy command"
        style={{
          minWidth: "62px",
          border: "1px solid var(--border-mid)",
          borderRadius: "7px",
          background: copied ? "var(--green-dim)" : "var(--bg-base)",
          color: copied ? "var(--green)" : "var(--text-2)",
          fontFamily: "var(--font-display)",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  )
}

function InstructionText({ text }) {
  const blocks = []
  let paragraph = []
  let commandLines = []

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push({ type: "paragraph", text: paragraph.join(" ") })
    paragraph = []
  }

  function flushCommands() {
    if (!commandLines.length) return
    blocks.push({ type: "commands", lines: commandLines })
    commandLines = []
  }

  for (const rawLine of (text || "").split("\n")) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushCommands()
      continue
    }

    if (/^(curl|cat|python3|gedit)\s+/.test(line)) {
      flushParagraph()
      commandLines.push(line)
      continue
    }

    flushCommands()
    paragraph.push(line)
  }

  flushParagraph()
  flushCommands()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {blocks.map((block, index) => {
        if (block.type === "commands") {
          return (
            <div key={index}>
              {block.lines.map((line) => (
                <CommandBlock key={line} command={line} />
              ))}
            </div>
          )
        }

        return (
          <p
            key={index}
            style={{
              margin: 0,
              fontSize: "13px",
              lineHeight: "1.7",
              color: "var(--text-2)",
            }}
          >
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

export default function LabGuide({
  item,
  currentStep,
  currentAnswer,
  onAnswerChange,
  onPrevStep,
  onNextStep,
}) {
  const [showHint, setShowHint] = useState(false)
  const [answerTouched, setAnswerTouched] = useState(false)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [tutorQuestion, setTutorQuestion] = useState("")
  const [tutorAnswer, setTutorAnswer] = useState("")
  const [tutorLoading, setTutorLoading] = useState(false)
  const [tutorError, setTutorError] = useState("")

  useEffect(() => {
    setShowHint(false)
    setAnswerTouched(false)
    setTutorOpen(false)
    setTutorQuestion(currentStep?.title || "")
    setTutorAnswer("")
    setTutorError("")
  }, [currentStep?.id])


  if (!item || !item.guide || !item.guide.steps || !currentStep) {
    return (
      <div style={{ padding: "24px", color: "var(--text-3)" }}>
        Loading guide...
      </div>
    )
  }

  const totalSteps = item.guide.steps.length
  const stepIndex = item.currentStepIndex
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100)
  const answerValid = isValid(currentStep, currentAnswer)

  async function askTutor() {
    const message = tutorQuestion.trim() || currentStep.title
    setTutorLoading(true)
    setTutorError("")
    setTutorAnswer("")

    try {
      const data = await request("/api/rag/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `Guide step: ${currentStep.title}\nStudent question: ${message}`,
          context: `${item.title} - ${currentStep.title}`,
        }),
      })
      setTutorAnswer(data.response || "")
    } catch (error) {
      setTutorError(error?.message || "Unable to contact tutor.")
    } finally {
      setTutorLoading(false)
    }
  }

  const handleNext = () => {
    if (!answerValid) {
      setAnswerTouched(true)
      return
    }

    setShowHint(false)
    setAnswerTouched(false)
    onNextStep()
  }

  const handlePrev = () => {
    setShowHint(false)
    onPrevStep()
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-panel)",
      }}
    >
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-dim)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--orange)",
                letterSpacing: "0.15em",
                marginBottom: "4px",
              }}
            >
              PHASE: {item?.phase?.toUpperCase() || "LOADING..."}
            </div>

            <div
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--text-1)",
                fontFamily: "var(--font-display)",
              }}
            >
              {item.title}
            </div>
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.1em",
            }}
          >
            STEP {stepIndex + 1} OF {totalSteps}
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
        style={{
          flex: 1,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            color: "var(--text-1)",
            fontFamily: "var(--font-display)",
            margin: 0,
          }}
        >
          {currentStep.title}
        </h2>

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
              setTutorOpen((open) => !open)
              if (!tutorQuestion) setTutorQuestion(currentStep.title)
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
              fontSize: "10px",
              letterSpacing: "0.08em",
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
                  fontSize: "12px",
                  lineHeight: 1.5,
                  outline: "none",
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
                    background: tutorLoading ? "var(--bg-surface)" : "rgba(56,189,248,0.10)",
                    color: "var(--blue)",
                    fontFamily: "var(--font-display)",
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: tutorLoading ? "wait" : "pointer",
                  }}
                >
                  {tutorLoading ? "ASKING..." : "SEND"}
                </button>
              </div>
              {tutorError && (
                <div style={{ color: "var(--red)", fontSize: "12px" }}>
                  {tutorError}
                </div>
              )}
              {tutorAnswer && (
                <div
                  style={{
                    color: "var(--text-2)",
                    fontSize: "12px",
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
            background: "var(--bg-surface)",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid var(--border-dim)",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "var(--text-3)",
              letterSpacing: "0.1em",
              marginBottom: "8px",
            }}
          >
            INSTRUCTIONS
          </div>

          <InstructionText text={currentStep.body} />
        </div>

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
              fontSize: "9px",
              color: "var(--orange)",
              letterSpacing: "0.1em",
              marginBottom: "8px",
            }}
          >
            OBSERVATION
          </div>

          <p
            style={{
              fontSize: "13px",
              lineHeight: "1.7",
              color: "var(--text-2)",
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

        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid var(--border-dim)",
            paddingTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-1)",
              fontWeight: "600",
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
              setAnswerTouched(false)
              onAnswerChange(currentStep.id, e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return

              e.preventDefault()

              if (!answerValid) {
                setAnswerTouched(true)
                return
              }

              handleNext()
            }}
            onBlur={() => {
              if ((currentAnswer || "").trim()) {
                setAnswerTouched(true)
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
                fontSize: "12px",
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
                  fontSize: "12px",
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
                fontSize: "11px",
                color: "var(--red)",
              }}
            >
              Incorrect or incomplete answer. Please review your workspace.
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
            fontSize: "12px",
          }}
        >
          ← PREVIOUS
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
            fontSize: "12px",
            boxShadow: answerValid
              ? "0 0 15px rgba(34,197,94,0.3)"
              : "0 0 15px rgba(249,115,22,0.15)",
          }}
        >
          {stepIndex === totalSteps - 1 ? "UNLOCK QUIZ" : "NEXT ->"}
        </button>
      </div>
    </div>
  )
}

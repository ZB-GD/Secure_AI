import { useState } from "react"

const KEY_TERMS = [
  "Received",
  "Logs",
  "received payload",
  "sensor payload",
  "poisoned data",
  "injected data point",
  "impossible values",
  "traffic_volume",
  "temp",
  "congestion_score",
  "Sensor Data Node",
  "Edge Pre-processing Node",
  "Inference & Action Node",
  "Trainer Node",
  "Workspace",
]

function HighlightedText({ text }) {
  if (typeof text !== "string") return text

  const escapedTerms = KEY_TERMS
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi")
  const parts = text.split(pattern)

  return parts.map((part, index) => {
    const isKeyTerm = KEY_TERMS.some(
      (term) => term.toLowerCase() === part.toLowerCase(),
    )

    if (!isKeyTerm) return part

    return (
      <strong
        key={`${part}-${index}`}
        style={{
          color: "var(--text-1)",
          fontWeight: 700,
        }}
      >
        {part}
      </strong>
    )
  })
}

function InfoBlock({ label, children, accent = false }) {
  return (
    <div
      style={{
        background: accent ? "rgba(249,115,22,0.06)" : "var(--bg-elevated)",
        border: accent
          ? "1px solid var(--orange-border)"
          : "1px solid var(--border-dim)",
        borderRadius: "8px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          letterSpacing: "0.14em",
          color: accent ? "var(--orange)" : "var(--text-3)",
          fontFamily: "var(--font-display)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "14px",
          lineHeight: "1.75",
          color: "var(--text-2)",
          fontFamily: "var(--font-display)",
        }}
      >
        <HighlightedText text={children} />
      </div>
    </div>
  )
}

export default function ScenarioGuide({ item, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState("idle")
  const [showHint, setShowHint] = useState(false)

  const hasQuestion = !!item.question?.options?.length

  function handleOption(option) {
    setSelected(option.id)
    setStatus(option.correct ? "correct" : "wrong")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-panel)" }}>
      <div
        style={{
          flexShrink: 0,
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <div style={{ fontSize: "10px", color: "var(--blue)", letterSpacing: "0.14em", marginBottom: "6px" }}>
          ◆ SCENARIO — {item.phase.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: "20px",
            fontWeight: "600",
            fontFamily: "var(--font-display)",
            color: "var(--text-1)",
            marginBottom: "3px",
          }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{item.subtitle}</div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <InfoBlock label="BACKGROUND">
          {item.story.intro}
        </InfoBlock>

        <InfoBlock label="SITUATION">
          {item.story.context}
        </InfoBlock>

        <InfoBlock label="YOUR ROLE" accent>
          {item.story.mission}
        </InfoBlock>

        <InfoBlock label="INVESTIGATION CHECKLIST">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              "Open NODE-1 in the pipeline view and check Received.",
              "Open NODE-2 and compare Received with Logs.",
              "Confirm where validation failed.",
              "Answer the assessment, then continue into the lab.",
            ].map((step, index) => (
              <div
                key={step}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr",
                  gap: "10px",
                  alignItems: "start",
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(56,189,248,0.08)",
                    border: "1px solid var(--blue-dim)",
                    color: "var(--blue)",
                    fontSize: "12px",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {index + 1}
                </span>
                <span>
                  <HighlightedText text={step} />
                </span>
              </div>
            ))}
          </div>
        </InfoBlock>

        {hasQuestion ? (
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-dim)",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.14em",
                color: "var(--text-3)",
                fontFamily: "var(--font-display)",
                marginBottom: "8px",
              }}
            >
              FINAL ASSESSMENT
            </div>

            <p
              style={{
                fontSize: "14px",
                color: "var(--text-1)",
                fontFamily: "var(--font-display)",
                fontWeight: "500",
                marginBottom: "10px",
                lineHeight: "1.7",
              }}
            >
              {item.question.text}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {item.question.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOption(option)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border:
                      status === "correct" && option.correct
                        ? "1px solid var(--green-border)"
                        : status === "wrong" && selected === option.id
                        ? "1px solid rgba(248,113,113,0.25)"
                        : "1px solid var(--border-dim)",
                    background:
                      status === "correct" && option.correct
                        ? "var(--green-dim)"
                        : status === "wrong" && selected === option.id
                        ? "var(--red-dim)"
                        : "var(--bg-base)",
                    color: "var(--text-1)",
                    fontSize: "14px",
                    fontFamily: "var(--font-display)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>{option.label}</div>
                  <div style={{ color: "var(--text-3)", lineHeight: "1.5" }}>{option.description}</div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
              <button
                onClick={() => setShowHint((v) => !v)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-dim)",
                  background: "transparent",
                  color: "var(--text-2)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {showHint ? "Hide hint" : "Show hint"}
              </button>
            </div>

            {showHint && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "rgba(56,189,248,0.08)",
                  border: "1px solid var(--blue-dim)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "var(--blue)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {item.question.hint}
              </div>
            )}

            {status === "wrong" && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "var(--red-dim)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "var(--red)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {item.question.wrongFeedback}
              </div>
            )}

            {status === "correct" && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  background: "var(--green-dim)",
                  border: "1px solid var(--green-border)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "var(--green)",
                  fontFamily: "var(--font-display)",
                }}
              >
                <div style={{ marginBottom: "12px", lineHeight: "1.5" }}>{item.question.correctFeedback}</div>
                <button
                  onClick={onComplete}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: "var(--green)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "bold",
                    fontFamily: "var(--font-display)",
                    cursor: "pointer",
                    boxShadow: "0 0 10px rgba(34,197,94,0.3)"
                  }}
                >
                  PROCEED TO LAB →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-dim)",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.14em",
                color: "var(--text-3)",
                fontFamily: "var(--font-display)",
                marginBottom: "8px",
              }}
            >
              SYSTEM READY
            </div>

            <p
              style={{
                fontSize: "14px",
                lineHeight: "1.75",
                color: "var(--text-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              Acknowledge the emergency briefing to gain access to the raw pipeline telemetry and commence the investigation.
            </p>

            <button
              onClick={onComplete}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "none",
                background: "var(--orange)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "bold",
                fontFamily: "var(--font-display)",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(249,115,22,0.3)"
              }}
            >
              COMMENCE INVESTIGATION →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

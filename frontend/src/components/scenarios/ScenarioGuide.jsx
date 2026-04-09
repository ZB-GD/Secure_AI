import { useState } from "react"

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
          fontSize: "9px",
          letterSpacing: "0.14em",
          color: accent ? "var(--orange)" : "var(--text-3)",
          fontFamily: "var(--font-mono)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "12px",
          lineHeight: "1.75",
          color: "var(--text-2)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {children}
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          flexShrink: 0,
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <div style={{ fontSize: "9px", color: "var(--blue)", letterSpacing: "0.14em", marginBottom: "6px" }}>
          ◆ SCENARIO — {item.phase.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: "600",
            fontFamily: "var(--font-display)",
            color: "var(--text-1)",
            marginBottom: "3px",
          }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.subtitle}</div>
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

        <InfoBlock label="STEP-BY-STEP GUIDE">
          <ol style={{ margin: 0, paddingLeft: "18px" }}>
            <li>Read the context and understand what the company is experiencing.</li>
            <li>Inspect the information shown in the workspace on the right.</li>
            <li>Decide which stage of the pipeline is failing first.</li>
            <li>Connect the evidence to a concrete vulnerability.</li>
            <li>Complete the scenario to unlock the next stage.</li>
          </ol>
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
                fontSize: "9px",
                letterSpacing: "0.14em",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                marginBottom: "8px",
              }}
            >
              FINAL CHALLENGE
            </div>

            <p
              style={{
                fontSize: "12px",
                color: "var(--text-1)",
                fontFamily: "var(--font-mono)",
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
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
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
                  fontSize: "11px",
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
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.20)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#fbbf24",
                  fontFamily: "var(--font-mono)",
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
                  fontSize: "11px",
                  color: "var(--red)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {item.question.wrongFeedback}
              </div>
            )}

            {status === "correct" && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "var(--green-dim)",
                  border: "1px solid var(--green-border)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "var(--green)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div>{item.question.correctFeedback}</div>
                <button
                  onClick={onComplete}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1px solid rgba(34,197,94,0.20)",
                    background: "rgba(34,197,94,0.08)",
                    color: "var(--green)",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                  }}
                >
                  Continue →
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
                fontSize: "9px",
                letterSpacing: "0.14em",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                marginBottom: "8px",
              }}
            >
              READY TO START
            </div>

            <p
              style={{
                fontSize: "12px",
                lineHeight: "1.75",
                color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              This introduction gives the learner the company context and the overall incident. Continue to open the next stage of the investigation.
            </p>

            <button
              onClick={onComplete}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1px solid var(--orange-border)",
                background: "var(--orange-dim)",
                color: "var(--orange)",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              Start investigation →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
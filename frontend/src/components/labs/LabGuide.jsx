function isValid(step, answer) {
  if (!step) return false
  const v = (answer || "").toLowerCase().trim()
  if (!v) return false
  return (step.expectedKeywords || []).some((kw) => v.includes(kw.toLowerCase()))
}

const S = {
  section: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-dim)",
    borderRadius: "8px",
    padding: "14px 16px",
  },
  label: {
    fontSize: "9px",
    letterSpacing: "0.14em",
    color: "var(--text-3)",
    fontFamily: "var(--font-mono)",
    marginBottom: "8px",
  },
  body: {
    fontSize: "12px",
    lineHeight: "1.75",
    color: "var(--text-2)",
    fontFamily: "var(--font-mono)",
  },
}

export default function LabGuide({
  item,
  currentStep,
  currentAnswer,
  currentAnswerValid,
  onAnswerChange,
  onPrevStep,
  onNextStep,
}) {
  if (!item || !item.guide || !item.guide.steps || !currentStep) {
    return (
      <div style={{ padding: "24px", color: "var(--text-3)" }}>
        <p style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}>Guide not available.</p>
      </div>
    )
  }

  const totalSteps = item.guide.steps.length
  const stepIndex = item.currentStepIndex
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100)
  const answerValid = isValid(currentStep, currentAnswer)

  const visibleRefs =
    currentStep.referenceKeys?.length > 0
      ? item.references.filter((r) => currentStep.referenceKeys.includes(r.id))
      : item.references

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header — fixed */}
      <div
        style={{
          flexShrink: 0,
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <div style={{ fontSize: "9px", color: "var(--text-3)", letterSpacing: "0.14em", marginBottom: "6px" }}>
          {item.phase}
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: "600",
            fontFamily: "var(--font-display)",
            color: "var(--text-1)",
            marginBottom: "4px",
          }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.subtitle}</div>

        {/* Progress bar */}
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <span style={{ fontSize: "9px", color: "var(--text-3)", letterSpacing: "0.10em" }}>
              STEP {stepIndex + 1} / {totalSteps}
            </span>
            <span style={{ fontSize: "9px", color: "var(--text-3)" }}>{progress}%</span>
          </div>
          <div
            style={{
              height: "2px",
              background: "var(--border-dim)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "var(--orange)",
                borderRadius: "2px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Step content — scrollable */}
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
        {/* Step title */}
        <div>
          <div style={{ fontSize: "9px", color: "var(--orange)", letterSpacing: "0.14em", marginBottom: "5px" }}>
            ▸ CURRENT STEP
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "600",
              fontFamily: "var(--font-display)",
              color: "var(--text-1)",
            }}
          >
            {currentStep.title}
          </div>
        </div>

        {/* Context */}
        <div style={S.section}>
          <div style={S.label}>CONTEXT</div>
          <p style={S.body}>{currentStep.body}</p>
        </div>

        {/* What to detect */}
        <div
          style={{
            ...S.section,
            background: "rgba(249,115,22,0.06)",
            border: "1px solid var(--orange-border)",
          }}
        >
          <div style={{ ...S.label, color: "var(--orange)" }}>WHAT TO DETECT</div>
          <p style={S.body}>{currentStep.observation}</p>
        </div>

        {/* Question + answer */}
        <div style={S.section}>
          <div style={S.label}>QUESTION</div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-1)",
              fontFamily: "var(--font-mono)",
              fontWeight: "500",
              marginBottom: "10px",
              lineHeight: "1.6",
            }}
          >
            {currentStep.question}
          </p>

          <textarea
            value={currentAnswer}
            onChange={(e) => onAnswerChange(currentStep.id, e.target.value)}
            placeholder={currentStep.placeholder}
            rows={3}
            style={{
              width: "100%",
              background: "var(--bg-base)",
              border: `1px solid ${answerValid ? "var(--green-border)" : "var(--border-mid)"}`,
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "11px",
              color: "var(--text-1)",
              fontFamily: "var(--font-mono)",
              lineHeight: "1.6",
              outline: "none",
              transition: "border-color 0.2s",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "8px",
            }}
          >
            <span style={{ fontSize: "9px", color: "var(--text-3)" }}>
              Include key observations in your answer
            </span>
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.10em",
                padding: "3px 8px",
                borderRadius: "4px",
                background: answerValid ? "var(--green-dim)" : "rgba(255,255,255,0.04)",
                border: answerValid ? "1px solid var(--green-border)" : "1px solid var(--border-dim)",
                color: answerValid ? "var(--green)" : "var(--text-3)",
              }}
            >
              {answerValid ? "✓ VALID" : "PENDING"}
            </span>
          </div>

          {item.showValidation && !currentAnswerValid && (
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
              Your answer needs more specific evidence. Review the context and try again.
            </div>
          )}
        </div>

        {/* References */}
        {visibleRefs.length > 0 && (
          <div style={S.section}>
            <div style={S.label}>REFERENCES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {visibleRefs.map((ref) => (
                <a
                  key={ref.id}
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    padding: "8px 12px",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "6px",
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: "500", color: "var(--blue)", marginBottom: "2px" }}>
                    {ref.title}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-3)", lineHeight: "1.5" }}>{ref.note}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {item.completed && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--green-dim)",
              border: "1px solid var(--green-border)",
              borderRadius: "6px",
              fontSize: "11px",
              color: "var(--green)",
              fontFamily: "var(--font-mono)",
              textAlign: "center",
            }}
          >
            ✓ Lab completed — next stage unlocked
          </div>
        )}
      </div>

      {/* Navigation footer — fixed */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border-dim)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          background: "var(--bg-panel)",
        }}
      >
        <button
          onClick={onPrevStep}
          disabled={stepIndex === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid var(--border-mid)",
            background: "transparent",
            color: stepIndex === 0 ? "var(--text-3)" : "var(--text-2)",
            fontSize: "11px",
            opacity: stepIndex === 0 ? 0.4 : 1,
            cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          ← PREV
        </button>

        {/* Step dots */}
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          {item.guide.steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === stepIndex ? "16px" : "5px",
                height: "5px",
                borderRadius: "3px",
                background: i < stepIndex
                  ? "var(--green)"
                  : i === stepIndex
                  ? "var(--orange)"
                  : "var(--border-mid)",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>

        <button
          onClick={onNextStep}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid var(--orange-border)",
            background: "var(--orange-dim)",
            color: "var(--orange)",
            fontSize: "11px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {stepIndex === totalSteps - 1 ? "COMPLETE ✓" : "NEXT →"}
        </button>
      </div>
    </div>
  )
}
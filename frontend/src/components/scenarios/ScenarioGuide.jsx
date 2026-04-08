import { useState } from "react"

const S = {
  card: {
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
    lineHeight: "1.85",
    color: "var(--text-2)",
    fontFamily: "var(--font-mono)",
  },
}

// Build a flat list of "slides" from the scenario data
function buildSlides(item) {
  const slides = []

  // Slide 0 — story intro
  slides.push({ type: "intro" })

  // One slide per evidence section that has content
  const sections = [
    { key: "inputs", label: "INPUTS" },
    { key: "files", label: "FILES" },
    { key: "prompts", label: "PROMPTS" },
    { key: "logs", label: "LOGS" },
  ]
  sections.forEach(({ key, label }) => {
    if (item.evidence[key]?.length > 0) {
      slides.push({ type: "evidence", key, label })
    }
  })

  // Last slide — question
  slides.push({ type: "question" })

  return slides
}

export default function ScenarioGuide({ item, onComplete }) {
  const slides = buildSlides(item)
  const [slideIndex, setSlideIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [wrong, setWrong] = useState(false)
  const [correct, setCorrect] = useState(false)

  const currentSlide = slides[slideIndex]
  const isFirst = slideIndex === 0
  const isLast = slideIndex === slides.length - 1

  function handleNext() {
    if (!isLast) setSlideIndex((i) => i + 1)
  }

  function handlePrev() {
    if (!isFirst) setSlideIndex((i) => i - 1)
  }

  function handleOption(option) {
    setSelected(option.id)
    if (option.correct) {
      setWrong(false)
      setCorrect(true)
    } else {
      setWrong(true)
      setCorrect(false)
      // Reset selection after a moment so the student can retry
      setTimeout(() => {
        setSelected(null)
        setWrong(false)
      }, 2200)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: "16px 20px 12px", borderBottom: "1px solid var(--border-dim)" }}>
        <div style={{ fontSize: "9px", color: "var(--blue)", letterSpacing: "0.14em", marginBottom: "6px" }}>
          ◆ SCENARIO — {item.phase.toUpperCase()}
        </div>
        <div style={{ fontSize: "16px", fontWeight: "600", fontFamily: "var(--font-display)", color: "var(--text-1)", marginBottom: "3px" }}>
          {item.title}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.subtitle}</div>

        {/* Slide progress dots */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "12px" }}>
          {slides.map((slide, i) => {
            const isDone = i < slideIndex
            const isCurrent = i === slideIndex
            const isQ = slide.type === "question"
            return (
              <div
                key={i}
                style={{
                  height: "4px",
                  borderRadius: "3px",
                  width: isCurrent ? "20px" : "8px",
                  background: isDone
                    ? "var(--green)"
                    : isCurrent
                    ? isQ ? "var(--orange)" : "var(--blue)"
                    : "var(--border-dim)",
                  transition: "all 0.2s",
                }}
              />
            )
          })}
          <span style={{ fontSize: "9px", color: "var(--text-3)", marginLeft: "4px", letterSpacing: "0.08em" }}>
            {slideIndex + 1}/{slides.length}
          </span>
        </div>
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* SLIDE: intro */}
        {currentSlide.type === "intro" && (
          <>
            <div style={S.card}>
              <div style={S.label}>SITUATION</div>
              <p style={S.body}>{item.story.intro}</p>
            </div>
            <div style={S.card}>
              <div style={S.label}>CONTEXT</div>
              <p style={S.body}>{item.story.context}</p>
            </div>
            <div style={{ ...S.card, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.20)" }}>
              <div style={{ ...S.label, color: "var(--blue)" }}>YOUR MISSION</div>
              <p style={{ ...S.body, color: "var(--text-1)", fontWeight: "500" }}>{item.story.mission}</p>
            </div>
          </>
        )}

        {/* SLIDE: evidence section */}
        {currentSlide.type === "evidence" && (
          <div style={S.card}>
            <div style={S.label}>
              {currentSlide.label} — REVIEW CAREFULLY
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {item.evidence[currentSlide.key].map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: "10px", fontWeight: "500", color: "var(--blue)", marginBottom: "6px", letterSpacing: "0.04em" }}>
                    {ev.title}
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-2)", lineHeight: "1.75", fontFamily: "var(--font-mono)" }}>
                    {ev.content}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "12px", padding: "8px 10px", background: "rgba(249,115,22,0.06)", border: "1px solid var(--orange-border)", borderRadius: "6px" }}>
              <p style={{ fontSize: "10px", color: "var(--orange)", fontFamily: "var(--font-mono)", lineHeight: "1.6" }}>
                ▸ Look for clues. What does this tell you about the pipeline?
              </p>
            </div>
          </div>
        )}

        {/* SLIDE: question */}
        {currentSlide.type === "question" && (
          <div style={S.card}>
            <div style={S.label}>IDENTIFY THE VULNERABILITY</div>
            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-1)", fontFamily: "var(--font-mono)", lineHeight: "1.7", marginBottom: "14px" }}>
              {item.question.text}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {item.question.options.map((option) => {
                const isSelected = selected === option.id
                const isCorrectOption = option.correct

                let bg = "var(--bg-base)"
                let border = "1px solid var(--border-dim)"
                let titleColor = "var(--text-1)"

                if (correct && isCorrectOption) {
                  bg = "var(--green-dim)"
                  border = "1px solid var(--green-border)"
                  titleColor = "var(--green)"
                } else if (wrong && isSelected) {
                  bg = "var(--red-dim)"
                  border = "1px solid rgba(248,113,113,0.25)"
                  titleColor = "var(--red)"
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => !correct && handleOption(option)}
                    disabled={correct}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border,
                      background: bg,
                      cursor: correct ? "default" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: "500", color: titleColor, fontFamily: "var(--font-mono)", marginBottom: "3px" }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "var(--font-mono)", lineHeight: "1.5" }}>
                      {option.description}
                    </div>
                  </button>
                )
              })}
            </div>

            {wrong && (
              <div style={{ marginTop: "10px", padding: "10px 12px", background: "var(--red-dim)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "6px", fontSize: "11px", color: "var(--red)", fontFamily: "var(--font-mono)", lineHeight: "1.6" }}>
                ✗ {item.question.wrongFeedback}
              </div>
            )}

            {correct && (
              <div style={{ marginTop: "10px", padding: "10px 12px", background: "var(--green-dim)", border: "1px solid var(--green-border)", borderRadius: "6px", fontSize: "11px", color: "var(--green)", fontFamily: "var(--font-mono)", lineHeight: "1.6" }}>
                ✓ {item.question.correctFeedback}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div style={{
        flexShrink: 0,
        borderTop: "1px solid var(--border-dim)",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-panel)",
      }}>
        <button
          onClick={handlePrev}
          disabled={isFirst}
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid var(--border-mid)",
            background: "transparent",
            color: isFirst ? "var(--text-3)" : "var(--text-2)",
            fontSize: "11px",
            opacity: isFirst ? 0.3 : 1,
            cursor: isFirst ? "not-allowed" : "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          ← PREV
        </button>

        {/* Right button */}
        {!isLast && (
          <button
            onClick={handleNext}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid rgba(56,189,248,0.25)",
              background: "var(--blue-dim)",
              color: "var(--blue)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            NEXT →
          </button>
        )}

        {isLast && !correct && (
          <div style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Answer to continue
          </div>
        )}

        {isLast && correct && (
          <button
            onClick={onComplete}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid var(--green-border)",
              background: "var(--green-dim)",
              color: "var(--green)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontWeight: "500",
            }}
          >
            UNLOCK NEXT STAGE →
          </button>
        )}
      </div>
    </div>
  )
}
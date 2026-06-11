import { useState, useEffect } from "react";

// --- ACADEMIC THEORETICAL FOUNDATIONS ---
// This dictionary injects the specific theory for each scenario phase dynamically.
const THEORETICAL_BASES = {
  "scenario-1": {
    topic: "Data Poisoning Attacks",
    concept:
      "The injection of malicious or physically impossible data into the ingestion pipeline. If unvalidated, the AI model learns or predicts based on corrupted reality, bypassing traditional firewalls.",
    reference: "OWASP ML02:2023",
    link: "/docs?id=owasp-ml02",
  },
  // Default fallback for future scenarios
  default: {
    topic: "AI Pipeline Security",
    concept:
      "AI systems must implement defense-in-depth across the entire pipeline: from data ingestion and input handling, to model training and output serving.",
    reference: "MITRE ATLAS",
  },
};

export default function ScenarioGuide({ item, onComplete, onSelectItem }) {
  // "briefing" shows the story & theory. "assessment" shows the question.
  const [view, setView] = useState("briefing");
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  // Reset state when the scenario item changes
  useEffect(() => {
    setView("briefing");
    setSelectedOption(null);
    setIsCorrect(null);
  }, [item.id]);

  const theory = THEORETICAL_BASES[item.id] || THEORETICAL_BASES["default"];
  const hasQuestion = !!item.question?.options?.length;

  const handleEvaluate = () => {
    if (!selectedOption) return;
    const option = item.question.options.find((o) => o.id === selectedOption);
    if (option) {
      setIsCorrect(option.correct);
    }
  };

  function openTheoryDoc(event) {
    if (!theory.link) return;
    if (!onSelectItem) return;

    event.preventDefault();

    const targetUrl = new URL(theory.link, window.location.origin);
    const docId = targetUrl.searchParams.get("id");

    onSelectItem({
      id: "docs",
      type: "docs",
      docPath: docId,
      docId: docId,
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-panel)",
        overflow: "hidden",
      }}
    >
      {/* --- MAIN CONTENT AREA (Scrolls internally ONLY if needed) --- */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {view === "briefing" ? (
          // === VIEW 1: BRIEFING & THEORY ===
          <>
            {/* SITUATION REPORT */}
            <div
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-dim)",
                borderRadius: "10px",
                padding: "16px",
                borderLeft: "3px solid var(--blue)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "14px",
                  color: "var(--text-3)",
                  textTransform: "uppercase",
                }}
              >
                Situation Report
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "var(--text-1)",
                  lineHeight: 1.65,
                }}
              >
                {item.story?.intro}
              </p>
              {item.story?.context && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "var(--text-2)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {item.story.context}
                </div>
              )}
            </div>

            {/* THEORETICAL FOUNDATION */}
            <div
              style={{
                background: "rgba(167,139,250,0.05)",
                border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#a78bfa",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>📚</span> Theoretical Foundation
                </h3>
                <a
                  href={theory.link || "/docs"}
                  onClick={openTheoryDoc}
                  title="Open in Threat Intelligence Center"
                  style={{
                    fontSize: "12px",
                    background: "rgba(167,139,250,0.15)",
                    color: "#a78bfa",
                    padding: "3px 8px",
                    borderRadius: "10px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "bold",
                    textDecoration: "none",
                    cursor: "pointer",
                    border: "1px solid transparent",
                    transition: "all 0.2s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(167,139,250,0.25)";
                    e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(167,139,250,0.15)";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  {theory.reference} <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              </div>
              <strong
                style={{
                  display: "block",
                  fontSize: "14px",
                  color: "var(--text-1)",
                  marginBottom: "8px",
                }}
              >
                {theory.topic}
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "var(--text-2)",
                  lineHeight: 1.6,
                }}
              >
                {theory.concept}
              </p>
            </div>

            {/* MISSION OBJECTIVE */}
            {item.story?.mission && (
              <div
                style={{
                  background: "rgba(249,115,22,0.08)",
                  border: "1px solid var(--orange-border)",
                  borderRadius: "10px",
                  padding: "16px",
                  borderLeft: "3px solid var(--orange)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "var(--orange)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "var(--orange)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    Start here
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--text-1)",
                    fontWeight: 500,
                    lineHeight: 1.65,
                  }}
                >
                  {item.story.mission}
                </p>
              </div>
            )}
          </>
        ) : (
          // === VIEW 2: ASSESSMENT ===
          <div
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <button
              onClick={() => setView("briefing")}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-dim)",
                borderRadius: "8px",
                color: "var(--text-2)",
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "16px",
                padding: "8px 14px",
                width: "fit-content",
                transition: "background 0.18s, color 0.18s, border-color 0.18s",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                e.currentTarget.style.color = "var(--text-1)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "var(--text-2)";
                e.currentTarget.style.borderColor = "var(--border-dim)";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Briefing
            </button>

            <div
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-dim)",
                borderRadius: "10px",
                padding: "20px",
                flex: 1,
              }}
            >
              <h3
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  color: "var(--text-1)",
                  lineHeight: 1.6,
                }}
              >
                {item.question?.text ||
                  "Based on the briefing, what is your initial assessment?"}
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {item.question?.options?.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (isCorrect !== null) return; // Prevent changing answer after evaluation
                      setSelectedOption(opt.id);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      background:
                        selectedOption === opt.id
                          ? "rgba(56,189,248,0.1)"
                          : "var(--bg-panel)",
                      border: `1px solid ${selectedOption === opt.id ? "var(--blue)" : "var(--border-dim)"}`,
                      borderRadius: "8px",
                      color: "var(--text-2)",
                      fontSize: "14px",
                      cursor: isCorrect !== null ? "default" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <strong
                      style={{
                        color: "var(--text-1)",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      {opt.label}
                    </strong>
                    <span style={{ lineHeight: 1.5, display: "block" }}>
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>

              {/* FEEDBACK BLOCK */}
              {isCorrect !== null && (
                <div
                  style={{
                    marginTop: "24px",
                    padding: "16px",
                    borderRadius: "8px",
                    background: isCorrect
                      ? "var(--green-dim)"
                      : "var(--red-dim)",
                    border: `1px solid ${isCorrect ? "var(--green-border)" : "rgba(248,113,113,0.3)"}`,
                  }}
                >
                  <strong
                    style={{
                      color: isCorrect ? "var(--green)" : "var(--red)",
                      fontSize: "14px",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    {isCorrect
                      ? "✅ Correct Assessment"
                      : "❌ Incorrect Assessment"}
                  </strong>
                  <span
                    style={{
                      color: "var(--text-1)",
                      fontSize: "14px",
                      lineHeight: 1.6,
                    }}
                  >
                    {isCorrect
                      ? item.question?.correctFeedback
                      : item.question?.wrongFeedback}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- BOTTOM ACTION BAR (Sticky at the bottom) --- */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
          flexShrink: 0,
        }}
      >
        {view === "briefing" ? (
          <button
            onClick={() => (hasQuestion ? setView("assessment") : onComplete())}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "8px",
              border: "none",
              background: "var(--orange)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 15px rgba(249,115,22,0.2)",
              textTransform: "uppercase",
              transition: "transform 0.1s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.02)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>
              {hasQuestion ? "Proceed to Assessment" : "Commence Investigation"}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ) : (
          <div style={{ display: "flex", gap: "12px" }}>
            {isCorrect === null ? (
              <button
                onClick={handleEvaluate}
                disabled={!selectedOption}
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "8px",
                  border: "none",
                  background: selectedOption
                    ? "var(--blue)"
                    : "var(--bg-surface)",
                  color: selectedOption ? "#fff" : "var(--text-3)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: selectedOption ? "pointer" : "not-allowed",
                  textTransform: "uppercase",
                  transition: "background 0.2s",
                }}
              >
                Submit Assessment
              </button>
            ) : isCorrect ? (
              <button
                onClick={onComplete}
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--green)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  textTransform: "uppercase",
                  boxShadow: "0 4px 15px rgba(74,222,128,0.2)",
                }}
              >
                <span>Complete Phase</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setIsCorrect(null);
                }}
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid var(--orange-border)",
                  background: "rgba(249,115,22,0.08)",
                  color: "var(--orange)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  textTransform: "uppercase",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="15 18 9 12 15 6"/></svg><span>Try Again</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";

// --- ACADEMIC THEORETICAL FOUNDATIONS ---
// This dictionary injects the specific theory for each scenario phase dynamically.
const THEORETICAL_BASES = {
  "scenario-0": {
    topic: "Cyber-Physical Systems (CPS)",
    concept: "CPS integrate digital AI processing with physical infrastructure. A logical failure or cyber attack in the AI pipeline directly causes physical world consequences, such as traffic gridlocks.",
    reference: "NIST SP 800-82"
  },
  "scenario-1": {
    topic: "Data Poisoning Attacks",
    concept: "The injection of malicious or physically impossible data into the ingestion pipeline. If unvalidated, the AI model learns or predicts based on corrupted reality, bypassing traditional firewalls.",
    reference: "OWASP ML02:2023",
    link: "/docs?id=owasp-ml02"
  },
  // Default fallback for future scenarios
  "default": {
    topic: "AI Pipeline Security",
    concept: "AI systems must implement defense-in-depth across the entire pipeline: from data ingestion and input handling, to model training and output serving.",
    reference: "MITRE ATLAS"
  }
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
    const option = item.question.options.find(o => o.id === selectedOption);
    if (option) {
      setIsCorrect(option.correct);
    }
  };



    function openTheoryDoc(event) {
      if (!theory.link) return;

      // Si no llega onSelectItem, dejamos que el href funcione como fallback.
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

      //BORARR LUEGO
      console.log("Opening theory doc:", {
        hasOnSelectItem: Boolean(onSelectItem),
        theoryLink: theory.link,
      });
    }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-panel)",
      overflow: "hidden" // COMPLETELY DISABLES GLOBAL SCROLL
    }}>
      
      {/* --- HEADER (Always visible) --- */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid var(--border-dim)", flexShrink: 0 }}>
        <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--blue)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
          {item.phase || "Investigation Phase"}
        </div>
        <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", color: "var(--text-1)", fontFamily: "var(--font-display)" }}>
          {item.title}
        </h2>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
          {item.subtitle}
        </p>
      </div>

      {/* --- MAIN CONTENT AREA (Scrolls internally ONLY if needed) --- */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {view === "briefing" ? (
          // === VIEW 1: BRIEFING & THEORY ===
          <>
            {/* SITUATION REPORT */}
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-dim)", borderRadius: "10px", padding: "16px", borderLeft: "3px solid var(--blue)" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "10px", color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Situation Report
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-1)", lineHeight: 1.6 }}>
                {item.story?.intro}
              </p>
              {item.story?.context && (
                <div style={{ marginTop: "12px", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "12px", color: "var(--text-2)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
                  {item.story.context}
                </div>
              )}
            </div>

            {/* THEORETICAL FOUNDATION */}
            <div style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3 style={{ margin: 0, fontSize: "10px", color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📚</span> Theoretical Foundation
                </h3>
                <a
                href={theory.link || "/docs"}
                onClick={openTheoryDoc}
                title="Open in Threat Intelligence Center"
                style={{
                  fontSize: "9px",
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
                {theory.reference} <span style={{ fontSize: "11px" }}>→</span>
              </a>
              </div>
              <strong style={{ display: "block", fontSize: "13px", color: "var(--text-1)", marginBottom: "6px" }}>
                {theory.topic}
              </strong>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-2)", lineHeight: 1.5 }}>
                {theory.concept}
              </p>
            </div>

            {/* MISSION OBJECTIVE */}
            {item.story?.mission && (
              <div style={{ background: "rgba(249,115,22,0.05)", border: "1px solid var(--orange-border)", borderRadius: "10px", padding: "16px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "10px", color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Mission Objective
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--orange)", fontWeight: 500, lineHeight: 1.5 }}>
                  {item.story.mission}
                </p>
              </div>
            )}
          </>
        ) : (
          // === VIEW 2: ASSESSMENT ===
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* NUEVO: BOTÓN DE ATRÁS */}
            <button
              onClick={() => {
                setView("briefing");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-3)",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "16px",
                padding: "0 4px",
                width: "fit-content",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-1)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
            >
              ← Back to Briefing
            </button>

            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-dim)", borderRadius: "10px", padding: "20px", flex: 1 }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--text-1)", lineHeight: 1.6 }}>
                {item.question?.text || "Based on the briefing, what is your initial assessment?"}
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                      background: selectedOption === opt.id ? "rgba(56,189,248,0.1)" : "var(--bg-panel)",
                      border: `1px solid ${selectedOption === opt.id ? "var(--blue)" : "var(--border-dim)"}`,
                      borderRadius: "8px",
                      color: "var(--text-2)",
                      fontSize: "12px",
                      cursor: isCorrect !== null ? "default" : "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <strong style={{ color: "var(--text-1)", display: "block", marginBottom: "6px" }}>
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
                <div style={{ 
                  marginTop: "24px", 
                  padding: "16px", 
                  borderRadius: "8px", 
                  background: isCorrect ? "var(--green-dim)" : "var(--red-dim)",
                  border: `1px solid ${isCorrect ? "var(--green-border)" : "rgba(248,113,113,0.3)"}` 
                }}>
                  <strong style={{ color: isCorrect ? "var(--green)" : "var(--red)", fontSize: "13px", display: "block", marginBottom: "8px" }}>
                    {isCorrect ? "✅ Correct Assessment" : "❌ Incorrect Assessment"}
                  </strong>
                  <span style={{ color: "var(--text-1)", fontSize: "12px", lineHeight: 1.6 }}>
                    {isCorrect ? item.question?.correctFeedback : item.question?.wrongFeedback}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
      </div>

      {/* --- BOTTOM ACTION BAR (Sticky at the bottom) --- */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-dim)", background: "var(--bg-panel)", flexShrink: 0 }}>
        {view === "briefing" ? (
          <button
            onClick={() => hasQuestion ? setView("assessment") : onComplete()}
            style={{
              width: "100%", padding: "16px", borderRadius: "8px", border: "none",
              background: "var(--orange)", color: "#fff", fontSize: "12px", fontWeight: 700,
              cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px",
              boxShadow: "0 4px 15px rgba(249,115,22,0.2)", textTransform: "uppercase", transition: "transform 0.1s"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <span>{hasQuestion ? "Proceed to Assessment" : "Commence Investigation"}</span>
            <span style={{ fontSize: "16px" }}>→</span>
          </button>
        ) : (
          <div style={{ display: "flex", gap: "12px" }}>
            {isCorrect === null ? (
              <button
                onClick={handleEvaluate}
                disabled={!selectedOption}
                style={{
                  flex: 1, padding: "16px", borderRadius: "8px", border: "none",
                  background: selectedOption ? "var(--blue)" : "var(--bg-surface)",
                  color: selectedOption ? "#fff" : "var(--text-3)",
                  fontSize: "12px", fontWeight: 700, cursor: selectedOption ? "pointer" : "not-allowed",
                  textTransform: "uppercase", transition: "background 0.2s"
                }}
              >
                Submit Assessment
              </button>
            ) : isCorrect ? (
              <button
                onClick={onComplete}
                style={{
                  flex: 1, padding: "16px", borderRadius: "8px", border: "none",
                  background: "var(--green)", color: "#fff", fontSize: "12px", fontWeight: 700,
                  cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px",
                  textTransform: "uppercase", boxShadow: "0 4px 15px rgba(74,222,128,0.2)"
                }}
              >
                <span>Complete Phase</span>
                <span style={{ fontSize: "16px" }}>→</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setIsCorrect(null);
                }}
                style={{
                  flex: 1, padding: "16px", borderRadius: "8px", border: "1px solid var(--orange-border)",
                  background: "rgba(249,115,22,0.08)", color: "var(--orange)", fontSize: "12px", fontWeight: 700,
                  cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px",
                  textTransform: "uppercase",
                }}
              >
                <span>← Try Again</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
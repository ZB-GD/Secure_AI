import { useState, useEffect } from "react";

// --- WELCOME PAGE: EMERGENCY BRIEFING ---
export default function WelcomePage({ item, onComplete, onSelectItem }) {
  const [text, setText] = useState("");
  const fullText =
    item.story?.context ||
    "CRITICAL INCIDENT: At 08:15 AM today, the AI forced all traffic lights on North Avenue to RED.\n\n• The AI model believes the streets are empty.\n• Physical cameras show severe gridlock.\n• No software updates were deployed today.";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 15);
    return () => clearInterval(timer);
  }, [fullText]);

  return (
    <section
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        background:
          "radial-gradient(circle at center, #0c1525 0%, #05080f 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "40px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              background: "var(--red-dim)",
              border: "1px solid var(--red)",
              borderRadius: "4px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "var(--red)",
                fontWeight: "700",
                letterSpacing: "0.2em",
              }}
            >
              URGENT CITY ALERT
            </span>
          </div>
          <h1
            style={{
              fontSize: "48px",
              fontFamily: "var(--font-display)",
              color: "var(--text-1)",
              lineHeight: "1.1",
              marginBottom: "24px",
            }}
          >
            CityFlow AI is <br />{" "}
            <span style={{ color: "var(--orange)" }}>
              failing in production.
            </span>
          </h1>
          <div
            style={{
              background: "rgba(12,17,32,0.6)",
              padding: "24px",
              borderRadius: "8px",
              border: "1px solid var(--border-mid)",
              minHeight: "160px",
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              lineHeight: "1.8",
              color: "var(--text-2)",
              whiteSpace: "pre-wrap",
            }}
          >
            {text}
            <span
              style={{
                borderLeft: "2px solid var(--orange)",
                marginLeft: "4px",
                animation: "blink 1s infinite",
              }}
            />
          </div>
          <button
            onClick={() => {
              onComplete?.();
              onSelectItem?.("dashboard");
            }}
            style={{
              marginTop: "32px",
              padding: "16px 32px",
              background: "var(--orange)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(249,115,22,0.3)",
            }}
          >
            INITIALIZE INVESTIGATION →
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              height: "240px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-mid)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                border: "2px dashed var(--red)",
                animation: "spin 10s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                fontSize: "10px",
                color: "var(--red)",
                fontWeight: "700",
              }}
            >
              GRIDLOCK DETECTED
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

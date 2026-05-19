import { useState, useEffect, useRef } from "react";
// IMPORTANTE: Asegúrate de que esta ruta a tu apiClient es correcta
import { request } from "../../services/apiClient";

export default function RagTutorWidget({ labId, phase, activeItem, placement = "floating" }) {
    
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      type: "text",
      content: "Hello! I am the CityFlow AI Tutor. I'm here to help you understand the investigation. Do you have any questions about the lab?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // CHIVATO PARA LA CONSOLA (Para comprobar que estás editando el archivo correcto)
  useEffect(() => {
    console.log("🚀 El nuevo RagTutorWidget sin emojis se ha cargado correctamente.");
  }, []);

  // Auto-scroll al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Manejo de los Quizzes automáticos
  useEffect(() => {
    if (isOpen && activeItem?.quizzes?.length > 0) {
      const hasQuizBeenSent = messages.some(m => m.type === "quiz");
      if (!hasQuizBeenSent) {
        const firstQuiz = activeItem.quizzes[0]; 
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            type: "quiz",
            question: firstQuiz.question,
            options: firstQuiz.options,
            correctAnswerIndex: firstQuiz.correctAnswerIndex,
            explanation: firstQuiz.explanation
          }
        ]);
      }
    }
  }, [isOpen, activeItem, messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", type: "text", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const data = await request("/api/rag/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMsg,
          context: phase || "Laboratorio general",
        }),
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", type: "text", content: data.response },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "text",
          content: `Error: ${error.message}`, 
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (messageIndex, selectedOptionIndex, correctOptionIndex, feedbackExp) => {
    const isCorrect = selectedOptionIndex === correctOptionIndex;
    setMessages((prev) => [
      ...prev,
      { role: "user", type: "text", content: `He seleccionado la opción ${String.fromCharCode(65 + selectedOptionIndex)}` },
      { role: "assistant", type: "text", content: isCorrect ? `Correcto. ${feedbackExp}` : `Incorrecto. ${feedbackExp}`, isHighlight: isCorrect }
    ]);
  };

  const isTopbar = placement === "topbar";
  const shellStyle = isTopbar
    ? { position: "relative", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: "120px" }
    : { position: "fixed", bottom: "20px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end" };
const panelStyle = isTopbar
    ? { position: "absolute", top: "44px", right: 0, width: "450px", height: "650px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: "12px", display: "flex", flexDirection: "column", boxShadow: "0 18px 50px rgba(0,0,0,0.55)", overflow: "hidden" }
    : { width: "420px", height: "600px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: "12px", marginBottom: "12px", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden" };
  return (
    <div style={shellStyle}>
      {isOpen && (
        <div style={panelStyle}>
          
          {/* Header - SIN EMOJIS, CON ICONO SVG */}
          <div style={{ padding: "12px 16px", background: "var(--blue-dim)", borderBottom: "1px solid var(--blue)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--blue)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3l1.9 5.8 1.9-5.8a2 2 0 0 1 1.3-1.3l5.8-1.9-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
                </svg>
              </div>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--blue)", fontFamily: "var(--font-mono)" }}>CITYFLOW TUTOR</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-base)" }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                
                {msg.type === "text" && (
                  <div style={{ 
                    maxWidth: "85%", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", lineHeight: "1.6",
                    background: msg.role === "user" ? "var(--bg-elevated)" : (msg.isHighlight ? "var(--green-dim)" : "rgba(56,189,248,0.05)"),
                    border: msg.role === "user" ? "1px solid var(--border-dim)" : (msg.isHighlight ? "1px solid var(--green)" : "1px solid var(--blue-dim)"),
                    color: msg.role === "user" ? "var(--text-1)" : (msg.isHighlight ? "var(--green)" : "var(--text-1)")
                  }}>
                    {msg.content}
                  </div>
                )}

                {msg.type === "quiz" && (
                  <div style={{ maxWidth: "90%", padding: "12px", borderRadius: "8px", background: "rgba(249,115,22,0.05)", border: "1px solid var(--orange-border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--orange)", marginBottom: "8px", fontWeight: "bold" }}>KNOWLEDGE CHECK</div>
                    <div style={{ fontSize: "12px", color: "var(--text-1)", marginBottom: "12px" }}>{msg.question}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {msg.options.map((opt, optIdx) => (
                        <button 
                          key={optIdx}
                          onClick={() => handleQuizAnswer(idx, optIdx, msg.correctAnswerIndex, msg.explanation)}
                          style={{ textAlign: "left", padding: "8px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: "4px", color: "var(--text-2)", fontSize: "10px", cursor: "pointer", transition: "all 0.2s" }}
                          onMouseOver={(e) => e.target.style.borderColor = "var(--orange)"}
                          onMouseOut={(e) => e.target.style.borderColor = "var(--border-dim)"}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && <div style={{ fontSize: "10px", color: "var(--text-3)", paddingLeft: "8px" }}>Escribiendo...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - SIN EMOJI, CON ICONO SVG */}
          <form onSubmit={handleSendMessage} style={{ padding: "12px", borderTop: "1px solid var(--border-dim)", display: "flex", gap: "8px", background: "var(--bg-panel)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta al tutor..."
              disabled={loading}
              style={{ flex: 1, background: "var(--bg-base)", border: "1px solid var(--border-dim)", color: "var(--text-1)", padding: "10px", borderRadius: "6px", fontSize: "12px", outline: "none" }}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Animación de pulso */}
      <style>
        {`
          @keyframes ai-pulse {
            0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.5); }
            70% { box-shadow: 0 0 0 12px rgba(56,189,248,0); }
            100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
          }
        `}
      </style>

      {/* Tutor button - SVG en vez de EMOJI */}
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        title={isTopbar ? "Ask the AI tutor" : "Open AI tutor"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isTopbar ? "9px" : "0",
          minWidth: isTopbar ? "142px" : "60px",
          width: isTopbar ? "142px" : "60px",
          height: isTopbar ? "38px" : "60px",
          padding: isTopbar ? "9px 14px" : 0,
          borderRadius: isTopbar ? "10px" : "50%",
          border: isOpen ? "1px solid rgba(56,189,248,0.65)" : "1px solid rgba(56,189,248,0.4)",
          background: isOpen
            ? "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(249,115,22,0.12))"
            : "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(15,23,42,0.95))",
          color: isOpen ? "var(--blue)" : "var(--text-1)",
          fontFamily: "var(--font-mono)",
          fontSize: isTopbar ? "10px" : "24px",
          fontWeight: 700,
          letterSpacing: isTopbar ? "0.12em" : 0,
          cursor: "pointer",
          animation: !isOpen && !isTopbar ? "ai-pulse 2.5s infinite" : "none",
          boxShadow: isTopbar
            ? (isOpen ? "0 0 22px rgba(56,189,248,0.28)" : "0 0 14px rgba(56,189,248,0.15)")
            : (isOpen ? "0 4px 24px rgba(56,189,248,0.35)" : "none"),
          transition: "transform 0.18s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px) scale(1.05)"}
        onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0) scale(1)"}
      >
        {isTopbar ? (
          <>
            <span style={{ width: "20px", height: "20px", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(56,189,248,0.16)", border: "1px solid rgba(56,189,248,0.35)", boxShadow: "0 0 10px rgba(56,189,248,0.25)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3l1.9 5.8 1.9-5.8a2 2 0 0 1 1.3-1.3l5.8-1.9-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
              </svg>
            </span>
            <span>{isOpen ? "TUTOR OPEN" : "ASK TUTOR"}</span>
            <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} />
          </>
        ) : (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isOpen ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3l1.9 5.8 1.9-5.8a2 2 0 0 1 1.3-1.3l5.8-1.9-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
                <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
              </svg>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
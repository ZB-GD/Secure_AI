import { useState, useEffect, useRef } from "react";
// IMPORTANTE: Asegúrate de que esta ruta a tu apiClient es correcta
import { request } from "../../services/apiClient";

export default function RagTutorWidget({ labId, phase, activeItem, placement = "floating" }) {
    
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      type: "text",
      content: "¡Hola! Soy CityFlow AI Tutor. Estoy aquí para ayudarte a entender la investigación. ¿Tienes alguna duda sobre el laboratorio?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Manejo de los Quizzes automáticos
  useEffect(() => {
    // Solo disparamos el quiz si el chat está abierto y hay preguntas
    if (isOpen && activeItem?.quizzes?.length > 0) {
      const hasQuizBeenSent = messages.some(m => m.type === "quiz");
      
      if (!hasQuizBeenSent) {
        // Elegimos la primera pregunta de la lista de 10
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
        content: `Error: ${error.message}`,  // así ves el error real en el chat
      },
    ]);
  } finally {
    setLoading(false);
  }
};

  // Función para manejar los tests (Quizzes)
  const handleQuizAnswer = (messageIndex, selectedOptionIndex, correctOptionIndex, feedbackExp) => {
    const isCorrect = selectedOptionIndex === correctOptionIndex;
    
    setMessages((prev) => [
      ...prev,
      { role: "user", type: "text", content: `He seleccionado la opción ${String.fromCharCode(65 + selectedOptionIndex)}` },
      { role: "assistant", type: "text", content: isCorrect ? `✅ ¡Correcto! ${feedbackExp}` : `❌ Incorrecto. ${feedbackExp}`, isHighlight: isCorrect }
    ]);
  };

  // Función para inyectar una pregunta de test desde fuera (útil para el futuro)
  const injectQuiz = (questionObj) => {
    setMessages((prev) => [...prev, { role: "assistant", type: "quiz", ...questionObj }]);
  };

  const isTopbar = placement === "topbar";
  const shellStyle = isTopbar
    ? {
        position: "relative",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        minWidth: "120px",
      }
    : {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      };
  const panelStyle = isTopbar
    ? {
        position: "absolute",
        top: "44px",
        right: 0,
        width: "360px",
        height: "460px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }
    : {
        width: "350px",
        height: "450px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: "12px",
        marginBottom: "12px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        overflow: "hidden",
      };

  return (
    <div style={shellStyle}>
      {isOpen && (
        <div style={panelStyle}>
          
          {/* Header */}
          <div style={{ padding: "12px 16px", background: "var(--blue-dim)", borderBottom: "1px solid var(--blue)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "16px" }}>🤖</div>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--blue)", fontFamily: "var(--font-display)" }}>CITYFLOW TUTOR</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "16px" }}>✕</button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-base)" }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                
                {msg.type === "text" && (
                  <div style={{ 
                    maxWidth: "85%", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", lineHeight: "1.5",
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

          {/* Input Area */}
          <form onSubmit={handleSendMessage} style={{ padding: "12px", borderTop: "1px solid var(--border-dim)", display: "flex", gap: "8px", background: "var(--bg-panel)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta al tutor..."
              disabled={loading}
              style={{ flex: 1, background: "var(--bg-base)", border: "1px solid var(--border-dim)", color: "var(--text-1)", padding: "10px", borderRadius: "6px", fontSize: "12px", outline: "none" }}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{ padding: "0 16px", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>
              ➤
            </button>
          </form>
        </div>
      )}

      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: isTopbar ? "120px" : "60px",
          height: isTopbar ? "36px" : "60px",
          borderRadius: isTopbar ? "8px" : "50%",
          background: isOpen ? "rgba(56,189,248,0.16)" : "var(--bg-elevated)",
          border: isOpen ? "1px solid var(--blue)" : "1px solid var(--border-dim)",
          boxShadow: isTopbar ? "none" : "0 4px 20px rgba(56,189,248,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: isTopbar ? "10px" : "24px",
          color: isOpen ? "var(--blue)" : "var(--text-2)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          letterSpacing: isTopbar ? "0.10em" : 0,
          transition: "transform 0.2s, border-color 0.15s, background 0.15s"
        }}
        onMouseOver={(e) => e.target.style.transform = "scale(1.1)"}
        onMouseOut={(e) => e.target.style.transform = "scale(1)"}
      >
        {isTopbar ? (isOpen ? "CLOSE TUTOR" : "ASK TUTOR") : isOpen ? "✕" : "🤖"}
      </button>
    </div>
  );
}

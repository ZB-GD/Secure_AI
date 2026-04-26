import { useState, useEffect } from "react";
import { request } from "../../services/apiClient";

export default function ScenarioLogsPanel({ node }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!node) return;

    async function fetchLogs() {
      setLoading(true);
      try {
        const data = await request(`/logs/${node}`);
        setLogs(data.lines || []);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
    // Opcional: polling cada 5 segundos si quieres "tiempo real"
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [node]);

  return (
    <div
      style={{
        background: "#05080f",
        border: "1px solid var(--border-dim)",
        borderRadius: "8px",
        height: "300px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-mono)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#111",
          padding: "6px 12px",
          fontSize: "10px",
          color: "var(--text-3)",
          borderBottom: "1px solid #222",
        }}
      >
        SYSTEM_LOGS // NODE: {node?.toUpperCase()}
      </div>
      <div
        style={{
          padding: "12px",
          overflowY: "auto",
          flex: 1,
          fontSize: "12px",
          lineHeight: "1.5",
        }}
      >
        {loading && logs.length === 0 ? (
          <span style={{ color: "var(--orange)" }}>
            Conectando con el contenedor...
          </span>
        ) : (
          logs.map((line, i) => (
            <div
              key={i}
              style={{
                color:
                  line.includes("ERROR") || line.includes("VULNERABLE")
                    ? "var(--red)"
                    : "var(--text-2)",
              }}
            >
              <span style={{ color: "var(--text-3)", marginRight: "8px" }}>
                [{i}]
              </span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

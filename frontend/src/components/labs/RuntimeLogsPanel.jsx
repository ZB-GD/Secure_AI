import { useEffect, useRef } from "react";

export default function RuntimeLogsPanel({ lines = [], statusLabel = "unknown" }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const statusColor =
    statusLabel === "running"
      ? "var(--green)"
      : statusLabel === "error"
      ? "var(--red)"
      : "var(--orange)";

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          flexShrink: 0,
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-dim)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.14em",
              marginBottom: "4px",
            }}
          >
            ISOLATED CONTAINER LOG STREAM
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-2)" }}>
            Live Docker output from the lab container
          </div>
        </div>

        <span
          style={{
            fontSize: "10px",
            color: statusColor,
            border: `1px solid ${statusColor}`,
            borderRadius: "999px",
            padding: "3px 8px",
            textTransform: "uppercase",
          }}
        >
          {statusLabel}
        </span>
      </header>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          background: "#05080f",
          padding: "14px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          lineHeight: "1.7",
          color: "var(--text-2)",
          whiteSpace: "pre-wrap",
        }}
      >
        {lines.length > 0 ? (
          lines.map((line, index) => (
            <div key={`${index}-${line}`} style={{ marginBottom: "4px" }}>
              {line}
            </div>
          ))
        ) : (
          <div style={{ color: "var(--text-3)" }}>
            Waiting for container output...
          </div>
        )}
      </div>
    </section>
  );
}
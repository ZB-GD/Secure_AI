import { useEffect, useRef } from "react";

export default function RuntimeLogsPanel({
  lines = [],
  statusLabel = "unknown",
}) {
  const scrollRef = useRef(null);
  const shouldFollowRef = useRef(true);

  useEffect(() => {
    if (shouldFollowRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  function handleLogScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldFollowRef.current = distanceFromBottom < 24;
  }

  const statusColor =
    statusLabel === "running"
      ? "var(--green)"
      : statusLabel === "error" || statusLabel === "compromised"
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
        onScroll={handleLogScroll}
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
            <div
              key={`${index}-${line}`}
              style={{
                marginBottom: "4px",
                color: line.includes("[ERROR]")
                  ? "var(--red)"
                  : line.includes("REJECTED") || line.includes("ATTACK BLOCKED")
                    ? "var(--green)"
                    : line.includes("[RESULT]") ||
                        line.includes("ATTACK SUCCESSFUL")
                      ? "var(--orange)"
                      : line.includes("ACCEPTED") ||
                          line.includes("congestion_score")
                        ? "var(--green)"
                        : "var(--text-2)",
              }}
            >
              {line}
            </div>
          ))
        ) : (
          <div style={{ color: "var(--text-3)" }}>
            Waiting for runtime events...
          </div>
        )}
      </div>
    </section>
  );
}

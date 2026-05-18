import { useEffect, useRef, useState } from "react";

export default function RuntimeLogsPanel({
  lines = [],
  statusLabel = "unknown",
}) {
  const scrollRef = useRef(null);
  const shouldFollowRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
    const atBottom = distanceFromBottom < 24;
    shouldFollowRef.current = atBottom;
    setIsAtBottom(atBottom);
  }

  function jumpToLatest() {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    shouldFollowRef.current = true;
    setIsAtBottom(true);
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
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          background: "#05080f",
        }}
      >
        <div
          ref={scrollRef}
          onScroll={handleLogScroll}
          style={{
            height: "100%",
            overflowY: "auto",
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
                          line.includes("ATTACK SUCCESSFUL") ||
                          line.includes("ACCEPTED")
                        ? "var(--orange)"
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

        {!isAtBottom && lines.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            style={{
              position: "absolute",
              right: "14px",
              bottom: "14px",
              padding: "7px 10px",
              borderRadius: "999px",
              border: "1px solid var(--orange-border)",
              background: "rgba(15,23,42,0.94)",
              color: "var(--orange)",
              fontFamily: "var(--font-display)",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(0,0,0,0.3)",
            }}
          >
            ↓ LATEST
          </button>
        )}
      </div>
    </section>
  );
}

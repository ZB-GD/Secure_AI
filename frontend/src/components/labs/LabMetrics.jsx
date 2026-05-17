export default function LabMetrics({
  driftScore = 12,
  accuracy = 98.5,
  isCompromised = false,
  statusLabel = "unknown",
  lastEvent = "No runtime events yet.",
}) {
  const colorDrift = driftScore > 40 ? "var(--red)" : "var(--green)";
  const colorAccuracy = accuracy < 70 ? "var(--red)" : "var(--green)";
  const statusColor =
    statusLabel === "running"
      ? "var(--green)"
      : statusLabel === "error"
      ? "var(--red)"
      : "var(--orange)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: "10px",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.1em",
              marginBottom: "8px",
            }}
          >
            MODEL DRIFT
          </div>

          <div
            style={{
              fontSize: "28px",
              color: colorDrift,
              fontWeight: "bold",
              fontFamily: "var(--font-display)",
              display: "flex",
              alignItems: "baseline",
              gap: "4px",
            }}
          >
            {driftScore}
            <span style={{ fontSize: "16px" }}>%</span>
          </div>

          <div
            style={{
              marginTop: "4px",
              fontSize: "10px",
              color: isCompromised ? "var(--red)" : "var(--text-3)",
            }}
          >
            {isCompromised
              ? "Compromised distribution detected"
              : "Distribution looks stable"}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: "10px",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.1em",
              marginBottom: "8px",
            }}
          >
            PREDICTION ACCURACY
          </div>

          <div
            style={{
              fontSize: "28px",
              color: colorAccuracy,
              fontWeight: "bold",
              fontFamily: "var(--font-display)",
              display: "flex",
              alignItems: "baseline",
              gap: "4px",
            }}
          >
            {accuracy}
            <span style={{ fontSize: "16px" }}>%</span>
          </div>

          <div
            style={{
              marginTop: "4px",
              fontSize: "10px",
              color: isCompromised ? "var(--red)" : "var(--text-3)",
            }}
          >
            {isCompromised
              ? "Unsafe model update propagated"
              : "Accuracy within normal margin"}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: "10px",
          padding: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              letterSpacing: "0.1em",
            }}
          >
            BACKEND STATUS
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
        </div>

        <div style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: "1.6" }}>
          {lastEvent}
        </div>
      </div>
    </div>
  );
}
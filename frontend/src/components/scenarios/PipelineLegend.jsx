const ENTRIES = [
  { color: "var(--green)", raw: "34,197,94", label: "Healthy" },
  { color: "var(--orange)", raw: "249,115,22", label: "Warning" },
  { color: "var(--red)", raw: "248,113,113", label: "Compromised" },
];

export default function PipelineLegend() {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      {ENTRIES.map(({ color, raw, label }) => (
        <div
          key={label}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: color,
              boxShadow:
                label !== "Healthy" ? `0 0 5px rgba(${raw},0.7)` : "none",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "var(--text-3)",
              fontSize: "12px",
              fontFamily: "var(--font-display)",
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

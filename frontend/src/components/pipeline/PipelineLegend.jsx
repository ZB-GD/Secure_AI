export default function PipelineLegend() {
  return (
    <div
      style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            background: "var(--green)",
            borderRadius: 3,
          }}
        />
        <span style={{ color: "var(--text-3)" }}>Healthy</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            background: "var(--orange)",
            borderRadius: 3,
          }}
        />
        <span style={{ color: "var(--text-3)" }}>Warning</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            background: "var(--red)",
            borderRadius: 3,
          }}
        />
        <span style={{ color: "var(--text-3)" }}>Compromised</span>
      </div>
    </div>
  );
}

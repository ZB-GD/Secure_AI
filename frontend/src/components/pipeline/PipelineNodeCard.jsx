export default function PipelineNodeCard({ node, isActive, onClick }) {
  const color =
    node.status === "compromised"
      ? "var(--red)"
      : node.status === "warning"
        ? "var(--orange)"
        : "var(--green)";

  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        padding: "10px",
        minWidth: "140px",
        borderRadius: "8px",
        border: isActive ? `2px solid ${color}` : "1px solid var(--border-dim)",
        background: isActive ? "rgba(0,0,0,0.12)" : "transparent",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: "11px", color: color, fontWeight: 700 }}>
        {node.code}
      </div>
      <div
        style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}
      >
        {node.name}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
        {node.summary}
      </div>
    </button>
  );
}

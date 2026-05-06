export default function PipelineNodeCard({ node, isActive, onClick }) {
  const color =
    node.status === "compromised"
      ? "var(--red)"
      : node.status === "warning"
        ? "var(--orange)"
        : "var(--green)";
  const toneBg =
    node.status === "compromised"
      ? "rgba(248,113,113,0.08)"
      : node.status === "warning"
        ? "rgba(249,115,22,0.08)"
        : "rgba(34,197,94,0.08)";
  const label = node.code?.replace("NODE-", "") || "";

  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr)",
        alignItems: "center",
        columnGap: "12px",
        width: "252px",
        minHeight: "96px",
        padding: "14px 16px",
        borderRadius: "8px",
        border: isActive
          ? `1px solid ${color}`
          : "1px solid rgba(148,163,184,0.13)",
        background: isActive
          ? `linear-gradient(135deg, ${toneBg}, rgba(15,23,42,0.82))`
          : "rgba(15,23,42,0.42)",
        boxShadow: isActive
          ? `0 0 0 1px ${toneBg}, 0 14px 30px rgba(0,0,0,0.24)`
          : "0 10px 24px rgba(0,0,0,0.16)",
        cursor: "pointer",
        textAlign: "left",
        transition:
          "border-color 0.16s ease, background 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "10px auto 10px 0",
          width: "3px",
          borderRadius: "0 999px 999px 0",
          background: color,
          opacity: isActive ? 1 : 0.55,
        }}
      />

      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "8px",
          border: `1px solid ${color}`,
          background: toneBg,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 800,
          fontFamily: "var(--font-mono)",
          letterSpacing: 0,
        }}
      >
        {label}
      </div>

      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <div
          style={{
            color,
            fontSize: "10px",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
          }}
        >
          {node.code}
        </div>

        <div
          style={{
            color: "var(--text-1)",
            fontSize: "13px",
            fontWeight: 700,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.name}
        </div>

        <div
          style={{
            color: "var(--text-3)",
            fontSize: "11px",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {node.summary}
        </div>
      </div>
    </button>
  );
}

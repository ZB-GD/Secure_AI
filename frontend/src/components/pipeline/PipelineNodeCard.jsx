import { useState } from "react";

const STATUS_CFG = {
  compromised: {
    color: "var(--red)",
    colorRaw: "248,113,113",
    label: "COMPROMISED",
  },
  warning: {
    color: "var(--orange)",
    colorRaw: "249,115,22",
    label: "WARNING",
  },
  healthy: {
    color: "var(--green)",
    colorRaw: "34,197,94",
    label: "HEALTHY",
  },
};

function StatusIcon({ status, color, colorRaw }) {
  if (status === "healthy") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle
          cx="12" cy="12" r="9"
          stroke={color} strokeWidth="1.5"
          fill={`rgba(${colorRaw}, 0.12)`}
        />
        <path
          d="M8.5 12L11 14.5L15.5 10"
          stroke={color} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5L21 19.5H3L12 4.5Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round"
        fill={`rgba(${colorRaw}, 0.12)`}
      />
      <line x1="12" y1="10.5" x2="12" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.5" r="1" fill={color} />
    </svg>
  );
}

export default function PipelineNodeCard({ node, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_CFG[node.status] || STATUS_CFG.healthy;
  const lit = isActive || hovered;

  return (
    <button
      onClick={onClick}
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
        minHeight: "114px",
        padding: 0,
        borderRadius: "10px",
        border: `1px solid rgba(${cfg.colorRaw}, ${lit ? 0.55 : 0.2})`,
        background: lit
          ? `rgba(${cfg.colorRaw}, 0.07)`
          : "rgba(12,17,32,0.85)",
        boxShadow: isActive
          ? `0 0 0 1px rgba(${cfg.colorRaw},0.3), 0 0 32px rgba(${cfg.colorRaw},0.18), 0 12px 32px rgba(0,0,0,0.35)`
          : hovered
            ? `0 0 18px rgba(${cfg.colorRaw},0.12), 0 8px 20px rgba(0,0,0,0.25)`
            : "0 4px 12px rgba(0,0,0,0.2)",
        cursor: "pointer",
        textAlign: "center",
        overflow: "hidden",
        transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
      }}
    >
      {/* Top status stripe */}
      <div
        style={{
          height: "2px",
          width: "100%",
          background: `rgba(${cfg.colorRaw}, ${lit ? 1 : 0.5})`,
          flexShrink: 0,
        }}
      />

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "12px 14px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "7px",
          width: "100%",
        }}
      >
        <StatusIcon status={node.status} color={cfg.color} colorRaw={cfg.colorRaw} />

        <div
          style={{
            color: lit ? "var(--text-1)" : "var(--text-2)",
            fontSize: "12px",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            lineHeight: 1.3,
            transition: "color 0.18s",
          }}
        >
          {node.name}
        </div>

        <span
          style={{
            padding: "2px 10px",
            borderRadius: "999px",
            border: `1px solid rgba(${cfg.colorRaw}, ${lit ? 0.6 : 0.3})`,
            background: `rgba(${cfg.colorRaw}, ${lit ? 0.15 : 0.07})`,
            color: cfg.color,
            fontSize: "9px",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: "0.14em",
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: `1px solid rgba(255,255,255,0.05)`,
          background: lit ? `rgba(${cfg.colorRaw}, 0.07)` : "rgba(0,0,0,0.25)",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          flexShrink: 0,
          transition: "background 0.18s",
        }}
      >
        <div
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: cfg.color,
            flexShrink: 0,
            opacity: node.status === "healthy" ? 0.6 : 1,
            boxShadow: node.status !== "healthy" ? `0 0 6px ${cfg.color}` : "none",
          }}
        />
        <span
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.12em",
            color: "var(--text-3)",
            fontWeight: 600,
          }}
        >
          {node.code}
        </span>
      </div>
    </button>
  );
}

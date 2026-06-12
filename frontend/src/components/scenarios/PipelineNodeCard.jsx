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

function StatusBadgeIcon({ status, color }) {
  if (status === "healthy") {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M20 6L9 17L4 12"
          stroke={color}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5L21.5 19.5H2.5L12 5Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line
        x1="12" y1="11" x2="12" y2="15"
        stroke={color} strokeWidth="2.2" strokeLinecap="round"
      />
      <circle cx="12" cy="18" r="1.1" fill={color} />
    </svg>
  );
}

const NODE_ICONS = {
  // Sensor Data — camera representing IoT sensor / data capture
  edge: (color) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="8" width="20" height="13" rx="2" stroke={color} strokeWidth="1.7" />
      <circle cx="12" cy="14.5" r="3.5" stroke={color} strokeWidth="1.7" />
      <path d="M9 8V6.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V8" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17.5" cy="11" r="1" fill={color} />
    </svg>
  ),
  // Edge Pre-processing — funnel representing data filtering and feature engineering
  preprocessing: (color) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"
        stroke={color} strokeWidth="1.7" strokeLinejoin="round"
      />
    </svg>
  ),
  // Actuator — lightning bolt representing ML inference triggering a physical action
  actuator: (color) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 14h8l-1 8 9-12h-8z"
        stroke={color} strokeWidth="1.7" strokeLinejoin="round"
      />
    </svg>
  ),
  // Trainer — database cylinder representing feature storage and model retraining
  trainer: (color) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke={color} strokeWidth="1.7" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke={color} strokeWidth="1.7" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke={color} strokeWidth="1.7" />
    </svg>
  ),
};

export default function PipelineNodeCard({ node, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_CFG[node.status] || STATUS_CFG.healthy;
  const lit = isActive || hovered;
  const iconColor = lit ? cfg.color : "var(--text-3)";

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
        height: "120px",
        padding: 0,
        borderRadius: "10px",
        border: `1px solid rgba(${cfg.colorRaw}, ${lit ? 0.7 : 0.42})`,
        background: lit
          ? `rgba(${cfg.colorRaw}, 0.09)`
          : "rgba(12,17,32,0.85)",
        boxShadow: isActive
          ? `0 0 0 1px rgba(${cfg.colorRaw},0.35), 0 0 32px rgba(${cfg.colorRaw},0.2), 0 12px 32px rgba(0,0,0,0.35)`
          : hovered
            ? `0 0 18px rgba(${cfg.colorRaw},0.15), 0 8px 20px rgba(0,0,0,0.25)`
            : `0 0 0 1px rgba(${cfg.colorRaw},0.1), 0 4px 12px rgba(0,0,0,0.25)`,
        cursor: "pointer",
        textAlign: "center",
        overflow: "hidden",
        transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
      }}
    >
      {/* Top status stripe */}
      <div
        style={{
          height: "3px",
          width: "100%",
          background: `rgba(${cfg.colorRaw}, ${lit ? 1 : 0.65})`,
          flexShrink: 0,
        }}
      />

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "10px 14px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          width: "100%",
        }}
      >
        {NODE_ICONS[node.id]?.(iconColor)}

        <div
          style={{
            color: lit ? "var(--text-1)" : "var(--text-2)",
            fontSize: "13px",
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
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "2px 10px",
            borderRadius: "999px",
            border: `1px solid rgba(${cfg.colorRaw}, ${lit ? 0.6 : 0.3})`,
            background: `rgba(${cfg.colorRaw}, ${lit ? 0.15 : 0.07})`,
            color: cfg.color,
            fontSize: "12px",
            fontFamily: "var(--font-display)",
          }}
        >
          <StatusBadgeIcon status={node.status} color={cfg.color} />
          {cfg.label}
        </span>
      </div>
    </button>
  );
}

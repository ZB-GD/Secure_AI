import { useState } from "react";

const TYPE_LABELS = {
  "NODE-1": "SEN",
  "NODE-2": "EDG",
  "NODE-3": "ACT",
  "NODE-4": "TRN",
};

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

export default function PipelineNodeCard({ node, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_CFG[node.status] || STATUS_CFG.healthy;
  const typeLabel = TYPE_LABELS[node.code] || node.code?.replace("NODE-", "N");
  const nodeNum = node.code?.replace("NODE-", "") || "";
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
        width: "190px",
        minHeight: "112px",
        padding: 0,
        borderRadius: "10px",
        border: `1px solid rgba(${cfg.colorRaw}, ${lit ? 0.45 : 0.1})`,
        background: lit
          ? `rgba(${cfg.colorRaw}, 0.06)`
          : "rgba(12,17,32,0.85)",
        boxShadow: isActive
          ? `0 0 0 1px rgba(${cfg.colorRaw},0.25), 0 0 28px rgba(${cfg.colorRaw},0.15), 0 12px 32px rgba(0,0,0,0.35)`
          : hovered
            ? `0 0 16px rgba(${cfg.colorRaw},0.1), 0 8px 20px rgba(0,0,0,0.25)`
            : "0 4px 12px rgba(0,0,0,0.2)",
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
        transition:
          "border-color 0.18s, box-shadow 0.18s, background 0.18s",
        flexShrink: 0,
      }}
    >
      {/* Top status stripe */}
      <div
        style={{
          height: "2px",
          background: `rgba(${cfg.colorRaw}, ${lit ? 1 : 0.45})`,
          flexShrink: 0,
          transition: "opacity 0.18s",
        }}
      />

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "9px 12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "7px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Watermark number */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: "6px",
            top: "2px",
            fontSize: "54px",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: cfg.color,
            opacity: lit ? 0.07 : 0.03,
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
            transition: "opacity 0.18s",
          }}
        >
          {nodeNum}
        </div>

        {/* Type badge + status dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              border: `1px solid rgba(${cfg.colorRaw}, ${lit ? 0.5 : 0.22})`,
              background: `rgba(${cfg.colorRaw}, ${lit ? 0.12 : 0.06})`,
              color: cfg.color,
              fontSize: "9px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              transition: "border-color 0.18s, background 0.18s",
            }}
          >
            {typeLabel}
          </span>

          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: cfg.color,
              flexShrink: 0,
              opacity: node.status === "healthy" ? 0.5 : 1,
              boxShadow:
                node.status !== "healthy"
                  ? `0 0 7px ${cfg.color}`
                  : "none",
            }}
          />
        </div>

        {/* Node name */}
        <div
          style={{
            color: lit ? "var(--text-1)" : "var(--text-2)",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            lineHeight: 1.3,
            transition: "color 0.18s",
          }}
        >
          {node.name}
        </div>

        {/* Summary */}
        <div
          style={{
            color: "var(--text-3)",
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          title={node.statusReason || node.summary}
        >
          {node.statusReason || node.summary}
        </div>
      </div>

      {/* Footer status bar */}
      <div
        style={{
          padding: "5px 12px",
          borderTop: `1px solid rgba(255,255,255,0.04)`,
          background: lit
            ? `rgba(${cfg.colorRaw}, 0.07)`
            : "rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
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
          }}
        />
        <span
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            color: cfg.color,
            fontWeight: 600,
          }}
        >
          {cfg.label}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-3)",
            marginLeft: "auto",
            letterSpacing: "0.06em",
          }}
        >
          {node.code}
        </span>
      </div>
    </button>
  );
}

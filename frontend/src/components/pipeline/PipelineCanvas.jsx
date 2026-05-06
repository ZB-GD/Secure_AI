import PipelineNodeCard from "./PipelineNodeCard";
import PipelineLegend from "./PipelineLegend";

const STATUS_COLORS = {
  compromised: "248,113,113",
  warning: "249,115,22",
  healthy: "34,197,94",
};

function Connector({ fromStatus, toStatus }) {
  const fromRaw = STATUS_COLORS[fromStatus] || STATUS_COLORS.healthy;
  const toRaw = STATUS_COLORS[toStatus] || STATUS_COLORS.healthy;
  const sameColor = fromStatus === toStatus;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        flexShrink: 0,
        width: "40px",
      }}
    >
      {/* Line */}
      <div
        style={{
          flex: 1,
          height: "1.5px",
          background: sameColor
            ? `rgba(${fromRaw}, 0.35)`
            : `linear-gradient(90deg, rgba(${fromRaw},0.4), rgba(${toRaw},0.4))`,
        }}
      />

      {/* Arrowhead */}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "5px solid transparent",
          borderBottom: "5px solid transparent",
          borderLeft: `6px solid rgba(${toRaw}, 0.55)`,
          flexShrink: 0,
        }}
      />
    </div>
  );
}

export default function PipelineCanvas({
  phases = [],
  activeNodeId,
  onNodeClick,
}) {
  return (
    <div
      style={{
        padding: "6px 0 4px",
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px",
        }}
      >
        <div
          style={{
            color: "var(--text-3)",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
          }}
        >
          PIPELINE
        </div>
        <PipelineLegend />
      </div>

      <div
        style={{
          overflowX: "auto",
          padding: "4px 4px 8px",
        }}
      >
        <div
          style={{
            width: "max-content",
            minWidth: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 0,
          }}
        >
          {phases.map((p, idx) => (
            <div
              key={p.id}
              style={{ display: "flex", alignItems: "center", gap: 0 }}
            >
              <PipelineNodeCard
                node={p}
                isActive={p.id === activeNodeId}
                onClick={() => onNodeClick?.(p.id)}
              />
              {idx < phases.length - 1 && (
                <Connector
                  fromStatus={p.status}
                  toStatus={phases[idx + 1].status}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

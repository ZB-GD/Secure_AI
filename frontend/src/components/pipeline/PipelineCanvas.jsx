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
        flexShrink: 0,
        width: "44px",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "2px",
          background: sameColor
            ? `rgba(${fromRaw}, 0.4)`
            : `linear-gradient(90deg, rgba(${fromRaw},0.45), rgba(${toRaw},0.45))`,
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: `7px solid rgba(${toRaw}, 0.6)`,
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
        padding: "10px 0 4px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            color: "var(--text-3)",
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "var(--font-display)",
            letterSpacing: "0.1em",
          }}
        >
          PIPELINE
        </div>
        <PipelineLegend />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          width: "100%",
          padding: "4px 20px 10px",
        }}
      >
        {phases.map((p, idx) => (
          <div
            key={p.id}
            style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}
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
  );
}

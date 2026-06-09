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
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
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
        {phases.flatMap((p, idx) => {
          const items = [
            <div
              key={p.id}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}
            >
              <PipelineNodeCard
                node={p}
                isActive={p.id === activeNodeId}
                onClick={() => onNodeClick?.(p.id)}
              />
            </div>,
          ];
          if (idx < phases.length - 1) {
            items.push(
              <Connector
                key={`c-${p.id}`}
                fromStatus={p.status}
                toStatus={phases[idx + 1].status}
              />
            );
          }
          return items;
        })}
      </div>

      {/* Feedback loop: Trainer → Actuator (retrained model)
          marginTop: -16px bridges the 10px bottom-padding of the nodes row
          + 6px flex gap so the bracket legs connect to the card bottoms. */}
      <div
        style={{
          position: "relative",
          padding: "0 20px",
          height: "56px",
          flexShrink: 0,
          marginTop: "-16px",
        }}
      >
        {/* U-shaped bracket */}
        <div
          style={{
            position: "absolute",
            left: "calc(63% - 5px)",
            right: "calc(11% + 5px)",
            top: 0,
            bottom: "20px",
            borderLeft: "1.5px dashed rgba(249,115,22,0.45)",
            borderRight: "1.5px dashed rgba(249,115,22,0.45)",
            borderBottom: "1.5px dashed rgba(249,115,22,0.45)",
            borderRadius: "0 0 6px 6px",
          }}
        />

        {/* Upward arrowhead at Actuator (destination) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "calc(63% - 5px)",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: "7px solid rgba(249,115,22,0.55)",
          }}
        />

        <span
          style={{
            position: "absolute",
            top: "40px",
            left: "calc(76% - 10px)",
            transform: "translateX(-50%)",
            fontSize: "10px",
            color: "rgba(249,115,22,0.5)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          retrained model
        </span>
      </div>
    </div>
  );
}

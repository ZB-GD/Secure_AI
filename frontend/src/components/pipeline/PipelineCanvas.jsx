import PipelineNodeCard from "./PipelineNodeCard";
import PipelineLegend from "./PipelineLegend";

export default function PipelineCanvas({
  phases = [],
  activeNodeId,
  onNodeClick,
}) {
  return (
    <div
      style={{
        padding: "12px 0",
        display: "flex",
        flexDirection: "column",
        gap: 12,
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
        <div style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 700 }}>
          Pipeline
        </div>
        <PipelineLegend />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          overflowX: "auto",
          padding: "10px 6px 14px",
        }}
      >
        {phases.map((p, idx) => (
          <div
            key={p.id}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <PipelineNodeCard
              node={p}
              isActive={p.id === activeNodeId}
              onClick={() => onNodeClick?.(p.id)}
            />
            {idx < phases.length - 1 && (
              <div
                style={{
                  position: "relative",
                  width: 34,
                  height: 1,
                  background: "rgba(148,163,184,0.22)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    right: -1,
                    top: -3,
                    width: 7,
                    height: 7,
                    borderTop: "1px solid rgba(148,163,184,0.35)",
                    borderRight: "1px solid rgba(148,163,184,0.35)",
                    transform: "rotate(45deg)",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
          gap: 12,
          alignItems: "center",
          overflowX: "auto",
          padding: "8px 4px",
        }}
      >
        {phases.map((p, idx) => (
          <div
            key={p.id}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <PipelineNodeCard
              node={p}
              isActive={p.id === activeNodeId}
              onClick={() => onNodeClick(p.id)}
            />
            {idx < phases.length - 1 && (
              <div
                style={{
                  width: 36,
                  height: 2,
                  background: "var(--border-dim)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

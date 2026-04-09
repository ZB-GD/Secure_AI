import PipelineStatus from "../labs/PipelineStatus"

const TYPE_COLORS = {
  scenario: { bg: "rgba(56,189,248,0.10)", border: "rgba(56,189,248,0.25)", text: "var(--blue)" },
  lab: { bg: "var(--orange-dim)", border: "var(--orange-border)", text: "var(--orange)" },
}

export default function TopBar({ items, activeItem, onSelectItem }) {
  const completedCount = items.filter((i) => i.completed).length

  return (
    <header
      style={{
        flexShrink: 0,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          gap: "16px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "160px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "7px",
              background: "var(--orange-dim)",
              border: "1px solid var(--orange-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 10px rgba(249,115,22,0.15)",
            }}
          >
            <span style={{ color: "var(--orange)", fontSize: "10px", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
              AI
            </span>
          </div>
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "700",
                fontFamily: "var(--font-display)",
                color: "var(--text-1)",
                letterSpacing: "0.04em",
              }}
            >
              SEC<span style={{ color: "var(--orange)" }}>LABS</span>
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>
              AI SECURITY TRAINING
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <PipelineStatus threatStage={activeItem.threatStage} />

        {/* Progress */}
        <div style={{ minWidth: "120px", textAlign: "right" }}>
          <div style={{ fontSize: "9px", color: "var(--text-3)", letterSpacing: "0.12em", marginBottom: "4px" }}>
            PROGRESS
          </div>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-1)", fontFamily: "var(--font-display)" }}>
            {completedCount}
            <span style={{ color: "var(--text-3)", fontSize: "13px" }}>/{items.length}</span>
          </div>
        </div>
      </div>

      {/* Journey navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "8px 20px 10px",
          borderTop: "1px solid var(--border-dim)",
          overflowX: "auto",
        }}
      >
        {items.map((item, index) => {
          const isActive = activeItem.id === item.id
          const colors = TYPE_COLORS[item.type]

          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {index > 0 && (
                <div
                  style={{
                    width: "16px",
                    height: "1px",
                    background: items[index - 1].completed ? "rgba(34,197,94,0.3)" : "var(--border-dim)",
                    flexShrink: 0,
                  }}
                />
              )}
              <button
                onClick={() => onSelectItem(item.id)}
                disabled={item.locked}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "2px",
                  padding: "6px 10px",
                  borderRadius: "7px",
                  border: isActive
                    ? `1px solid ${colors.border}`
                    : item.completed
                    ? "1px solid rgba(34,197,94,0.20)"
                    : "1px solid var(--border-dim)",
                  background: isActive
                    ? colors.bg
                    : item.completed
                    ? "rgba(34,197,94,0.05)"
                    : "transparent",
                  opacity: item.locked ? 0.35 : 1,
                  cursor: item.locked ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.10em",
                    color: isActive ? colors.text : item.completed ? "var(--green)" : "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {item.type === "scenario" ? "◆ SCENARIO" : "⬡ LAB"} {index + 1}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "500",
                    color: isActive ? "var(--text-1)" : item.completed ? "var(--text-2)" : "var(--text-3)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {item.shortTitle}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </header>
  )
}
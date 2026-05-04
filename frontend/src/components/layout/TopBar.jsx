import PipelineStatus from "../labs/PipelineStatus";

const TYPE_COLORS = {
  scenario: {
    bg: "rgba(56,189,248,0.10)",
    border: "rgba(56,189,248,0.25)",
    text: "var(--blue)",
  },
  lab: {
    bg: "var(--orange-dim)",
    border: "var(--orange-border)",
    text: "var(--orange)",
  },
};

export default function TopBar({ items, activeItem, onSelectItem }) {
  const labs = items.filter((i) => i.type === "lab");
  const completedCount = labs.filter((i) => i.completed).length;

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: "160px",
          }}
        >
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
            <span
              style={{
                color: "var(--orange)",
                fontSize: "10px",
                fontWeight: "600",
                fontFamily: "var(--font-mono)",
              }}
            >
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
            <div
              style={{
                fontSize: "9px",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
              }}
            >
              AI SECURITY TRAINING
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <PipelineStatus threatStage={activeItem?.threatStage} />

        {/* Progress */}
        <div style={{ minWidth: "120px", textAlign: "right" }}>
          <div
            style={{
              fontSize: "9px",
              color: "var(--text-3)",
              letterSpacing: "0.12em",
              marginBottom: "4px",
            }}
          >
            PROGRESS
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text-1)",
              fontFamily: "var(--font-display)",
            }}
          >
            {completedCount}
            <span style={{ color: "var(--text-3)", fontSize: "13px" }}>
              /{labs.length}
            </span>
          </div>
        </div>
      </div>

      {/* Lab navigation */}
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
        <button
          onClick={() => onSelectItem("dashboard")}
          style={{
            padding: "8px 12px",
            borderRadius: "7px",
            border:
              activeItem.id === "dashboard"
                ? "1px solid var(--orange-border)"
                : "1px solid var(--border-dim)",
            background:
              activeItem.id === "dashboard"
                ? "var(--orange-dim)"
                : "transparent",
            color:
              activeItem.id === "dashboard" ? "var(--text-1)" : "var(--text-3)",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.10em",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          DASHBOARD
        </button>

        {labs.map((item) => {
          const isActive = activeItem.id === item.id;
          const colors = TYPE_COLORS[item.type];
          const available = item.guide?.steps?.length > 0;

          return (
            <div
              key={item.id}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <button
                onClick={() => onSelectItem(item.id)}
                disabled={!available}
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
                  opacity: available ? 1 : 0.35,
                  cursor: available ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.10em",
                    color: isActive
                      ? colors.text
                      : item.completed
                        ? "var(--green)"
                        : "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  {item.type === "scenario" ? "◆ " : "⬡ "} {item.shortTitle}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "500",
                    color: isActive
                      ? "var(--text-1)"
                      : item.completed
                        ? "var(--text-2)"
                        : "var(--text-3)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {item.phase}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";

export default function TopBar({ items, activeItem, onSelectItem }) {
  const scenarios = items.filter((i) => i.type === "scenario");
  const labs = items.filter((i) => i.type === "lab");
  const completedCount = labs.filter((i) => i.completed).length;
  const activeId = typeof activeItem === "string" ? activeItem : activeItem?.id;

  // A lab showing its scenario intro (scenarioViewed = false) behaves like a scenario for nav purposes
  const isLabInScenarioIntro =
    activeItem?.type === "lab" &&
    activeItem?.scenario &&
    !activeItem?.scenarioViewed;

  // When a lab is in scenario-intro mode, highlight the linked scenario in the list
  const effectiveActiveId = isLabInScenarioIntro
    ? activeId.replace("lab", "scenario")
    : activeId;

  const initialType = items.find((it) => it.id === activeId)?.type;
  const [navView, setNavView] = useState(() => {
    if (activeId === "dashboard" || initialType === "welcome") return "home";
    if (initialType === "scenario") return "scenarios";
    if (initialType === "lab") {
      const labItem = items.find((it) => it.id === activeId);
      return labItem?.scenario && !labItem?.scenarioViewed ? "scenarios" : "labs";
    }
    return "labs";
  });

  useEffect(() => {
    if (!activeId) return;
    if (activeId === "dashboard") setNavView("home");
    else {
      const found = items.find((it) => it.id === activeId);
      const t = found?.type;
      if (t === "welcome") setNavView("home");
      if (t === "scenario") setNavView("scenarios");
      if (t === "lab") {
        // Only auto-switch when lab transitions into/out of scenario-intro mode
        if (found?.scenario && !found?.scenarioViewed) setNavView("scenarios");
        else setNavView("labs");
      }
    }
  }, [activeId, items]);

  const navTabs = [
    { id: "home", label: "DASHBOARD" },
    {
      id: "scenarios",
      label: "SCENARIOS",
      badge: `${scenarios.filter((s) => s.completed).length}/${scenarios.length}`,
    },
    {
      id: "labs",
      label: "LABS",
      badge: `${completedCount}/${labs.length}`,
    },
  ];

  return (
    <header
      style={{
        flexShrink: 0,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      {/* Top row: logo · nav tabs · progress */}
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

        {/* Segmented nav control */}
        <div
          style={{
            display: "inline-flex",
            border: "1px solid var(--border-dim)",
            borderRadius: "8px",
            overflow: "hidden",
            background: "var(--bg-elevated)",
          }}
        >
          {navTabs.map((tab, i) => {
            const isActive = navView === tab.id;
            const isScenario = tab.id === "scenarios";
            const activeBg =
              tab.id === "home"
                ? "var(--orange-dim)"
                : isScenario
                  ? "rgba(56,189,248,0.10)"
                  : "var(--orange-dim)";
            const activeColor =
              isScenario ? "var(--blue)" : "var(--text-1)";

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setNavView(tab.id);
                  if (tab.id === "home") onSelectItem("dashboard");
                }}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRight:
                    i < navTabs.length - 1
                      ? "1px solid var(--border-dim)"
                      : "none",
                  background: isActive ? activeBg : "transparent",
                  color: isActive ? activeColor : "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.10em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 6px",
                      borderRadius: "999px",
                      background: isActive
                        ? isScenario
                          ? "rgba(56,189,248,0.18)"
                          : "rgba(249,115,22,0.18)"
                        : "var(--bg-surface)",
                      color: isActive
                        ? isScenario
                          ? "var(--blue)"
                          : "var(--orange)"
                        : "var(--text-3)",
                      fontWeight: 600,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

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

      {/* Item selector row — hidden on home/dashboard */}
      {navView !== "home" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 20px 8px",
            borderTop: "1px solid var(--border-dim)",
            overflowX: "auto",
          }}
        >
          {(navView === "scenarios" ? scenarios : labs).map((item) => {
            const isActive = effectiveActiveId === item.id;
            const isScenario = item.type === "scenario";
            const available =
              isScenario || (item.guide?.steps?.length ?? 0) > 0;

            const borderColor = isActive
              ? isScenario
                ? "rgba(56,189,248,0.35)"
                : "var(--orange-border)"
              : item.completed
                ? "rgba(34,197,94,0.20)"
                : "var(--border-dim)";

            const bgColor = isActive
              ? isScenario
                ? "rgba(56,189,248,0.10)"
                : "var(--orange-dim)"
              : item.completed
                ? "rgba(34,197,94,0.05)"
                : "transparent";

            const dotColor = isActive
              ? isScenario
                ? "var(--blue)"
                : "var(--orange)"
              : item.completed
                ? "var(--green)"
                : "var(--text-3)";

            const labelColor = isActive
              ? isScenario
                ? "var(--blue)"
                : "var(--text-1)"
              : item.completed
                ? "var(--green)"
                : "var(--text-3)";

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                disabled={!available}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${borderColor}`,
                  background: bgColor,
                  opacity: available ? 1 : 0.35,
                  cursor: available ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    color: labelColor,
                    textTransform: "uppercase",
                  }}
                >
                  {item.shortTitle}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: isActive ? "var(--text-2)" : "var(--text-3)",
                    fontFamily: "var(--font-display)",
                    maxWidth: "160px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.phase}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

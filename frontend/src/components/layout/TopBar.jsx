import { useEffect, useState } from "react";
import RagTutorWidget from "../workspace/RagTutorWidget";

export default function TopBar({ items, activeItem, onSelectItem }) {
  const scenarios = items.filter((i) => i.type === "scenario");
  const labs = items.filter((i) => i.type === "lab");

  const completedCount = labs.filter((i) => i.completed).length;
  const activeId = typeof activeItem === "string" ? activeItem : activeItem?.id;
  const [lastLabId, setLastLabId] = useState("");

  const investigationStarted = items.some(
    (item) => item.id === "scenario-0" && item.completed,
  );

  const unlockedLabs = labs.filter((lab) => lab.scenarioViewed);
  const hasUnlockedLabs = unlockedLabs.length > 0;
  const lastUnlockedLab = unlockedLabs[unlockedLabs.length - 1] || null;
  const currentLab =
    activeItem?.type === "lab"
      ? activeItem
      : labs.find((lab) => lab.id === lastLabId) || lastUnlockedLab;

  const isLabScenarioIntro =
    activeItem?.type === "lab" &&
    activeItem?.scenario &&
    !activeItem?.scenarioViewed;

  const isLabRuntime =
    activeItem?.type === "lab" &&
    (!activeItem?.scenario || activeItem?.scenarioViewed);

  const activeScenarioId = isLabScenarioIntro
    ? activeId.replace("lab", "scenario")
    : activeId;

  const [navView, setNavView] = useState("home");

  useEffect(() => {
    if (activeItem?.type !== "lab") return;
    setLastLabId(activeItem.id);
  }, [activeItem]);

  useEffect(() => {
    if (!activeId) return;

    if (activeItem?.type === "pipeline" || isLabScenarioIntro) {
      setNavView("scenarios");
      return;
    }

    if (isLabRuntime) {
      setNavView("labs");
      return;
    }

    if (activeId === "dashboard" || activeItem?.type === "welcome") {
      setNavView("home");
    }
  }, [activeId, activeItem?.type, isLabScenarioIntro, isLabRuntime]);

  const navTabs = [
    {
      id: "home",
      label: "DASHBOARD",
      disabled: !investigationStarted,
    },
    {
      id: "scenarios",
      label: "PIPELINE",
      badge: `${scenarios.filter((s) => s.completed).length}/${scenarios.length}`,
      disabled: !investigationStarted,
    },
    {
      id: "labs",
      label: "LABS",
      badge: `${completedCount}/${labs.length}`,
      disabled: !investigationStarted || !hasUnlockedLabs,
    },
  ];

  function handleTabClick(tab) {
    if (tab.disabled) return;

    if (tab.id === "home") {
      setNavView("home");
      onSelectItem("dashboard");
      return;
    }

    if (tab.id === "labs") {
      const targetLab = currentLab || lastUnlockedLab;
      if (!targetLab) return;

      setNavView("labs");
      onSelectItem(targetLab.id);
      return;
    }

    if (tab.id === "scenarios") {
      setNavView("scenarios");
      onSelectItem("pipeline");
    }
  }

  return (
    <header
      style={{
        flexShrink: 0,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          gap: "16px",
        }}
      >
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

        <div
          style={{
            display: "inline-flex",
            border: "1px solid var(--border-dim)",
            borderRadius: "8px",
            overflow: "hidden",
            background: "var(--bg-elevated)",
          }}
        >
          {navTabs.map((tab, index) => {
            const isActive = navView === tab.id;
            const isScenarioTab = tab.id === "scenarios";
            const isDisabled = Boolean(tab.disabled);

            const activeBg =
              tab.id === "home"
                ? "var(--orange-dim)"
                : isScenarioTab
                  ? "rgba(56,189,248,0.10)"
                  : "var(--orange-dim)";

            const activeColor =
              isScenarioTab ? "var(--blue)" : "var(--text-1)";

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                disabled={isDisabled}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRight:
                    index < navTabs.length - 1
                      ? "1px solid var(--border-dim)"
                      : "none",
                  background: isActive ? activeBg : "transparent",
                  color: isActive ? activeColor : "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.10em",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled && !isActive ? 0.35 : 1,
                  whiteSpace: "nowrap",
                  maxWidth: tab.id === "labs" ? "320px" : "none",
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
                        ? isScenarioTab
                          ? "rgba(56,189,248,0.18)"
                          : "rgba(249,115,22,0.18)"
                        : "var(--bg-surface)",
                      color: isActive
                        ? isScenarioTab
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

        <RagTutorWidget
          labId={activeItem?.id}
          phase={activeItem?.phase}
          activeItem={activeItem}
          placement="topbar"
        />
      </div>

      {navView === "scenarios" && investigationStarted && (
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
          {scenarios.map((item) => {
            const isActive = activeScenarioId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                disabled
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: isActive
                    ? "1px solid rgba(56,189,248,0.35)"
                    : "1px solid var(--border-dim)",
                  background: isActive
                    ? "rgba(56,189,248,0.10)"
                    : "transparent",
                  opacity: isActive ? 1 : 0.35,
                  cursor: "not-allowed",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: isActive ? "var(--blue)" : "var(--text-3)",
                    flexShrink: 0,
                  }}
                />

                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    color: isActive ? "var(--blue)" : "var(--text-3)",
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
                    maxWidth: "180px",
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

      {navView === "labs" && investigationStarted && hasUnlockedLabs && (
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
          {labs.map((item) => {
            const isActive = activeId === item.id;
            const unlocked = Boolean(item.scenarioViewed);
            const available =
              unlocked && (item.guide?.steps?.length ?? 0) > 0;

            const borderColor = isActive
              ? "var(--orange-border)"
              : item.completed
                ? "rgba(34,197,94,0.20)"
                : "var(--border-dim)";

            const bgColor = isActive
              ? "var(--orange-dim)"
              : item.completed
                ? "rgba(34,197,94,0.05)"
                : "transparent";

            const dotColor = isActive
              ? "var(--orange)"
              : item.completed
                ? "var(--green)"
                : unlocked
                  ? "var(--orange)"
                  : "var(--text-3)";

            const labelColor = isActive
              ? "var(--text-1)"
              : item.completed
                ? "var(--green)"
                : unlocked
                  ? "var(--text-2)"
                  : "var(--text-3)";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => available && onSelectItem(item.id)}
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

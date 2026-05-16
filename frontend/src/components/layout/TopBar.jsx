import { useEffect, useState } from "react";
import RagTutorWidget from "../workspace/RagTutorWidget";

export default function TopBar({ items, activeItem, onSelectItem }) {
  const labs = items.filter((i) => i.type === "lab");

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
  const currentLabLabel = currentLab
    ? `${currentLab.shortTitle.toUpperCase()} - ${currentLab.phase}`
    : "LABS";

  const isLabScenarioIntro =
    activeItem?.type === "lab" &&
    activeItem?.scenario &&
    !activeItem?.scenarioViewed;

  const isLabRuntime =
    activeItem?.type === "lab" &&
    (!activeItem?.scenario || activeItem?.scenarioViewed);

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
      disabled: !investigationStarted,
    },
    {
      id: "labs",
      label: currentLabLabel,
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
        <button
          type="button"
          onClick={() => onSelectItem("scenario-0")}
          aria-label="Go to welcome page"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: "160px",
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
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
                fontFamily: "var(--font-display)",
              }}
            >
              AI
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: "14px",
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
                fontSize: "10px",
                color: "var(--text-3)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.12em",
              }}
            >
              AI SECURITY TRAINING
            </div>
          </div>
        </button>

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

            const activeColor = isScenarioTab ? "var(--blue)" : "var(--text-1)";

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
                  fontFamily: "var(--font-display)",
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
    </header>
  );
}

import { useEffect, useState } from "react";
import RagTutorWidget from "../workspace/RagTutorWidget";

const LAST_LAB_STORAGE_KEY = "seclabs:last-lab-id";

export default function TopBar({ items, activeItem, onSelectItem }) {
  const labs = items.filter((i) => i.type === "lab");

  const activeId = typeof activeItem === "string" ? activeItem : activeItem?.id;

  const [lastLabId, setLastLabId] = useState(
    () => localStorage.getItem(LAST_LAB_STORAGE_KEY) || "",
  );

  const investigationStarted = items.some(
    (item) => item.id === "scenario-0" && item.completed,
  );

  const unlockedLabs = labs.filter((lab) => lab.scenarioViewed);
  const lastUnlockedLab = unlockedLabs[unlockedLabs.length - 1] || null;

  const firstAvailableLab =
    labs.find((lab) => lab.guide?.steps?.length) || labs[0] || null;

  const pipelineUnlocked = items.some(
    (item) => item.id === "scenario-1" && item.completed,
  );

  const currentLab =
    activeItem?.type === "lab"
      ? activeItem
      : labs.find((lab) => lab.id === lastLabId) || lastUnlockedLab || null;

  const labTabTarget = currentLab || lastUnlockedLab || firstAvailableLab;

  const isActuallyInsideLab = activeItem?.type === "lab";

  const currentLabLabel =
    isActuallyInsideLab && currentLab
      ? `LAB - ${currentLab.shortTitle.replace(/^Lab\s*/i, "")} ${currentLab.title}`
      : "LABS";

  const activeNavId =
  activeItem?.type === "docs" || activeId === "docs"
    ? "docs"
    : activeItem?.type === "lab"
      ? "labs"
      : activeItem?.id === "scenario-1" || activeItem?.type === "pipeline"
        ? "scenarios"
        : "home";

  useEffect(() => {
    if (activeItem?.type !== "lab") return;
    setLastLabId(activeItem.id);
    localStorage.setItem(LAST_LAB_STORAGE_KEY, activeItem.id);
  }, [activeItem]);


  const navTabs = [
    {
      id: "home",
      label: "DASHBOARD",
      disabled: !investigationStarted,
      tooltip: !investigationStarted ? "Complete the briefing to unlock" : undefined,
    },
    {
      id: "scenarios",
      label: "PIPELINE",
      disabled: !investigationStarted || !pipelineUnlocked,
      tooltip: !investigationStarted
        ? "Complete the briefing to unlock"
        : !pipelineUnlocked
          ? "Complete Lab 1 to unlock the pipeline view"
          : undefined,
    },
    {
      id: "labs",
      label: currentLabLabel,
      disabled: !investigationStarted || !lastUnlockedLab,
      tooltip: !investigationStarted
        ? "Complete the briefing to unlock"
        : !lastUnlockedLab
          ? "Start a lab from the Dashboard to unlock"
          : undefined,
    },
    {
      id: "docs",
      label: "DOC",
      disabled: !investigationStarted,
      tooltip: !investigationStarted ? "Complete the briefing to unlock" : undefined,
    },
  ];

    function goHome() {
      if (investigationStarted) {
        onSelectItem("dashboard");
        return;
      }

      onSelectItem("scenario-0");
    }

    function handleTabClick(tab) {
      if (tab.disabled) return;

      if (tab.id === "home") {
        onSelectItem("dashboard");
        return;
      }

      if (tab.id === "scenarios") {
        if (!pipelineUnlocked) return;
        onSelectItem("scenario-1");
        return;
      }

      if (tab.id === "labs") {
        if (!labTabTarget) return;
        onSelectItem(labTabTarget.id);
        return;
      }

      if (tab.id === "docs") {
        onSelectItem({
          id: "docs",
          type: "docs",
          docPath: null,
          docId: null,
        });
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
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "16px 28px",
          gap: "22px",
        }}
      >
        <button
          type="button"
          onClick={goHome}
          title="Go to home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            minWidth: "220px",
            width: "fit-content",
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "var(--orange-dim)",
              border: "1px solid var(--orange-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 10px rgba(249,115,22,0.15)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: "var(--orange)",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}
            >
              AI
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: "var(--text-1)",
                letterSpacing: "0.14em",
              }}
            >
              SEC<span style={{ color: "var(--orange)" }}>LABS</span>
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
              }}
            >
              AI SECURITY TRAINING
            </div>
          </div>
        </button>

        <nav
          aria-label="Main navigation"
          style={{
            display: "inline-flex",
            border: "1px solid var(--border-dim)",
            borderRadius: "12px",
            overflow: "hidden",
            background: "rgba(15,23,42,0.95)",
            justifySelf: "center",
            boxShadow: "0 0 18px rgba(0,0,0,0.22)",
          }}
        >
          {navTabs.map((tab, index) => {
            const isActive = activeNavId === tab.id;
            const isScenarioTab = tab.id === "scenarios";
            const isDocsTab = tab.id === "docs";
            const isDisabled = Boolean(tab.disabled);

            const activeBg =
              tab.id === "home" || tab.id === "labs"
                ? "var(--orange-dim)"
                : "rgba(56,189,248,0.10)";

            const activeColor =
              isScenarioTab || isDocsTab ? "var(--blue)" : "var(--text-1)";

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                disabled={isDisabled}
                title={tab.tooltip}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRight:
                    index < navTabs.length - 1
                      ? "1px solid var(--border-dim)"
                      : "none",
                  background: isActive ? activeBg : "transparent",
                  color: isActive
                    ? activeColor
                    : isDisabled
                      ? "var(--text-2)"
                      : "var(--text-1)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled && !isActive ? 0.65 : 1,
                  whiteSpace: "nowrap",
                  maxWidth: tab.id === "labs" ? "420px" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            minWidth: "180px",
          }}
        >
          <RagTutorWidget
            labId={activeItem?.id}
            phase={activeItem?.phase}
            activeItem={activeItem}
            placement="topbar"
          />
        </div>
      </div>
    </header>
  );
}
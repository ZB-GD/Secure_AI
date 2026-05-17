import { useEffect, useState } from "react";
import RagTutorWidget from "../workspace/RagTutorWidget";

export default function TopBar({ items, activeItem, onSelectItem }) {
  const labs = items.filter((i) => i.type === "lab");

  const activeId = typeof activeItem === "string" ? activeItem : activeItem?.id;
  const [lastLabId, setLastLabId] = useState("");

  const [lastLabId, setLastLabId] = useState(
    () => localStorage.getItem(LAST_LAB_STORAGE_KEY) || "",
  );

  const [navView, setNavView] = useState("home");

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

  const currentLab =
    activeItem?.type === "lab"
      ? activeItem
      : labs.find((lab) => lab.id === lastLabId) || lastUnlockedLab;

  const isActuallyInsideLab = activeItem?.type === "lab";

  const currentLabLabel =
    isActuallyInsideLab && currentLab
      ? `LAB - ${currentLab.shortTitle.replace(/^Lab\s*/i, "")} ${currentLab.title}`
      : "LABS";

  useEffect(() => {
    if (activeItem?.type !== "lab") return;

    setLastLabId(activeItem.id);
    localStorage.setItem(LAST_LAB_STORAGE_KEY, activeItem.id);
  }, [activeItem]);

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

    if (activeItem?.type === "lab") {
      setNavView("labs");
      return;
    }

    if (activeItem?.type === "docs" || activeId === "docs") {
      setNavView("docs");
      return;
    }

    if (activeId === "dashboard" || activeItem?.type === "welcome") {
      setNavView("home");
    }
  }, [activeId, activeItem?.type]);

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
    {
      id: "docs",
      label: "DOC",
      disabled: !investigationStarted,
    },
  ];

  function goHome() {
    if (investigationStarted) {
      setNavView("home");
      onSelectItem("dashboard");
      return;
    }

    setNavView("home");
    onSelectItem("scenario-0");
  }

  function handleTabClick(tab) {
    if (tab.disabled) return;

    if (tab.id === "home") {
      setNavView("home");
      onSelectItem("dashboard");
      return;
    }

    if (tab.id === "labs") {
      if (!currentLab) return;

      setNavView("labs");
      onSelectItem(currentLab.id);
      return;
    }

    if (tab.id === "scenarios") {
      setNavView("scenarios");
      onSelectItem("pipeline");
      return;
    }

    if (tab.id === "docs") {
      setNavView("docs");
      onSelectItem("docs");
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
          padding: "10px 20px",
          gap: "16px",
        }}
      >
        {/* Logo / Home button */}
        <button
          type="button"
          onClick={goHome}
          title="Go to home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: "180px",
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
              width: "30px",
              height: "30px",
              borderRadius: "7px",
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

        {/* Main navigation */}
        <nav
          aria-label="Main navigation"
          style={{
            display: "inline-flex",
            border: "1px solid var(--border-dim)",
            borderRadius: "8px",
            overflow: "hidden",
            background: "var(--bg-elevated)",
            justifySelf: "center",
          }}
        >
          {navTabs.map((tab, index) => {
            const isActive = navView === tab.id;
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

                {tab.badge !== undefined && (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 6px",
                      borderRadius: "999px",
                      background: isActive
                        ? isScenarioTab || isDocsTab
                          ? "rgba(56,189,248,0.18)"
                          : "rgba(249,115,22,0.18)"
                        : "var(--bg-surface)",
                      color: isActive
                        ? isScenarioTab || isDocsTab
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
        </nav>

        {/* Tutor */}
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

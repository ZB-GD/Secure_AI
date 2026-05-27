import { useState, useRef, useCallback, useEffect } from "react";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import WorkspacePanel from "../workspace/WorkspacePanel";

const SIDEBAR_DEFAULT_WIDTH = 340;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 600;

function clampSidebarWidth(width) {
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}

function buildBreadcrumb(activeItem) {
  if (!activeItem) return ["Dashboard"];

  if (activeItem.type === "welcome") {
    return ["Emergency Briefing"];
  }

  if (activeItem.type === "dashboard") {
    return ["Dashboard"];
  }

  if (activeItem.type === "pipeline") {
    return ["Dashboard", "Pipeline"];
  }

  if (activeItem.type === "lab") {
    const labLabel = activeItem.shortTitle || activeItem.title || "Lab";
    const steps = activeItem.guide?.steps || [];

    if (activeItem.scenario && !activeItem.scenarioViewed) {
      return ["Dashboard", labLabel, "Scenario"];
    }

    if (steps.length > 0) {
      const stepNumber = Math.min(
        Math.max((activeItem.currentStepIndex ?? 0) + 1, 1),
        steps.length,
      );
      return ["Dashboard", labLabel, `Guide · Step ${stepNumber}/${steps.length}`];
    }

    return ["Dashboard", labLabel];
  }

  if (activeItem.type === "scenario") {
    return ["Dashboard", activeItem.shortTitle || activeItem.title || "Scenario"];
  }

  return ["Dashboard"];
}

function BreadcrumbStrip({ activeItem, onSelectItem }) {
  const crumbs = buildBreadcrumb(activeItem);

  return (
    <div
      aria-label="Current location"
      style={{
        flexShrink: 0,
        minHeight: "30px",
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "6px 24px",
        borderBottom: "1px solid var(--border-dim)",
        background: "rgba(15,23,42,0.58)",
        color: "var(--text-3)",
        fontFamily: "var(--font-display)",
        fontSize: "10px",
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const isDashboard = crumb === "Dashboard" && !isLast;

        return (
          <span
            key={`${crumb}-${index}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              minWidth: 0,
              color: isLast ? "var(--text-1)" : "var(--text-3)",
            }}
          >
            {isDashboard ? (
              <button
                type="button"
                onClick={() => onSelectItem?.("dashboard")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--text-3)",
                  fontFamily: "var(--font-display)",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                {crumb}
              </button>
            ) : (
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {crumb}
              </span>
            )}
            {!isLast && <span style={{ color: "var(--text-3)" }}>{">"}</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function MainLayout({
  items,
  activeItem,
  currentStep,
  currentAnswer,
  currentAnswerValid,
  onSelectItem,
  onCompleteScenario,
  onAnswerChange,
  onPrevStep,
  onNextStep,
  onCompleteLabQuiz,
  onStartLab,
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    return clampSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
  });
  const isResizingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH);
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH);
  const isFullWidthBriefing = activeItem.id === "scenario-0";
const isScenario = activeItem.type === "scenario";

const isCompletedPipelineScenario =
  activeItem.id === "scenario-1" && activeItem.completed;

const showSidebar =
  !isFullWidthBriefing && isScenario && !isCompletedPipelineScenario;

  // Keep ref in sync so startResize always reads the latest width without deps
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const stopResize = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.body.classList.remove("is-resizing-layout");
  }, []);

  const resizeGuide = useCallback((clientX) => {
    setSidebarWidth(() => {
      const delta = clientX - dragStartXRef.current;
      return clampSidebarWidth(dragStartWidthRef.current + delta);
    });
  }, []);

  const startResize = useCallback((event) => {
    event.preventDefault();
    isResizingRef.current = true;
    dragStartXRef.current = event.clientX;
    dragStartWidthRef.current = sidebarWidthRef.current;
    document.body.classList.add("is-resizing-layout");
  }, []);

  useEffect(() => {
    function handlePointerMove(event) {
      if (!isResizingRef.current) return;
      resizeGuide(event.clientX);
    }

    function handlePointerUp() {
      stopResize();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.classList.remove("is-resizing-layout");
    };
  }, [resizeGuide, stopResize]);

  useEffect(() => {
    function handleWindowResize() {
      setSidebarWidth((width) => clampSidebarWidth(width));
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <TopBar
        items={items}
        activeItem={activeItem}
        onSelectItem={onSelectItem}
      />

      <BreadcrumbStrip activeItem={activeItem} onSelectItem={onSelectItem} />

      <div
        style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        {/* Sidebar only for standalone scenario items */}
        {showSidebar && (
          <>
            <Sidebar
              item={activeItem}
              width={sidebarWidth}
              currentStep={currentStep}
              currentAnswer={currentAnswer}
              currentAnswerValid={currentAnswerValid}
              onCompleteScenario={onCompleteScenario}
              onAnswerChange={onAnswerChange}
              onPrevStep={onPrevStep}
              onNextStep={onNextStep}
              onSelectItem={onSelectItem}
            />
            <button
              type="button"
              className="layout-resizer"
              onPointerDown={startResize}
              aria-label="Resize guide and workspace"
              title="Resize guide and workspace"
            />
          </>
        )}

        <main
          style={{
            flex: 1,
            overflow: "hidden",
            minWidth: 0,
            position: "relative",
          }}
        >
          <WorkspacePanel
            items={items}
            item={activeItem}
            onSelectItem={onSelectItem}
            onCompleteScenario={onCompleteScenario}
            currentStep={currentStep}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
            onPrevStep={onPrevStep}
            onNextStep={onNextStep}
            onCompleteLabQuiz={onCompleteLabQuiz}
            onStartLab={onStartLab}
          />
        </main>
      </div>
    </div>
  );
}
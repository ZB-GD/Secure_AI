import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import WorkspacePanel from "../workspace/WorkspacePanel";

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 620;
const SIDEBAR_DEFAULT_WIDTH = 360;

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

function BreadcrumbStrip({ activeItem }) {
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
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

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
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {crumb}
            </span>
            {!isLast && <span style={{ color: "var(--text-3)" }}>{">"}</span>}
          </span>
        );
      })}
    </div>
  );
}

function clampSidebarWidth(width) {
  const viewportMax =
    typeof window === "undefined"
      ? SIDEBAR_MAX_WIDTH
      : Math.max(
          SIDEBAR_MIN_WIDTH,
          Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - 420),
        );

  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), viewportMax);
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
    const saved = Number(
      window.localStorage.getItem("seclabs-sidebar-width"),
    );
    return clampSidebarWidth(
      Number.isFinite(saved) && saved > 0 ? saved : SIDEBAR_DEFAULT_WIDTH,
    );
  });
  const isResizingRef = useRef(false);
  const isFullWidthBriefing = activeItem.id === "scenario-0";
  const isScenario = activeItem.type === "scenario";
  const showSidebar = !isFullWidthBriefing && isScenario;

  const stopResize = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.body.classList.remove("is-resizing-layout");
  }, []);

  const resizeGuide = useCallback((clientX) => {
    setSidebarWidth((currentWidth) => {
      const nextWidth = clampSidebarWidth(clientX);
      return nextWidth === currentWidth ? currentWidth : nextWidth;
    });
  }, []);

  const startResize = useCallback(
    (event) => {
      event.preventDefault();
      isResizingRef.current = true;
      document.body.classList.add("is-resizing-layout");
      resizeGuide(event.clientX);
    },
    [resizeGuide],
  );

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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "seclabs-sidebar-width",
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

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
      <BreadcrumbStrip activeItem={activeItem} />

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

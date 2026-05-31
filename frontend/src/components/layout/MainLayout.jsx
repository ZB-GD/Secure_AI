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
  const isScenario = activeItem.type === "scenario";

const isCompletedPipelineScenario =
  activeItem.id === "scenario-1" && activeItem.completed;

const showSidebar = isScenario && !isCompletedPipelineScenario;

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
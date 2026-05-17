import { useState, useRef, useEffect } from "react";
import Sidebar from "../layout/Sidebar";
import ScenarioWorkspace from "../scenarios/ScenarioWorkspace";
import { journey } from "../../data/journey";

const SIDEBAR_MIN = 340;
const SIDEBAR_MAX = 760;
const SIDEBAR_DEFAULT = 480;

export default function LabScenarioIntro({ item, onStartLab }) {
  const linkedId = item.id.replace("lab", "scenario");
  const scenarioItem =
    journey.find((entry) => entry.id === linkedId) || item.scenario;

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    function onMove(e) {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidth.current + delta));
      setSidebarWidth(next);
    }
    function onUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <section
      style={{
        height: "100%",
        display: "flex",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <Sidebar
        item={scenarioItem}
        width={sidebarWidth}
        onCompleteScenario={() => onStartLab?.(item.id)}
      />

      {/* Drag handle — same style as Lab 1 splitter */}
      <div
        onMouseDown={(e) => {
          isDragging.current = true;
          dragStartX.current = e.clientX;
          dragStartWidth.current = sidebarWidth;
          document.body.style.cursor = "col-resize";
        }}
        style={{
          width: "12px",
          flexShrink: 0,
          cursor: "col-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          borderRight: "1px solid var(--border-dim)",
        }}
      >
        <div
          style={{
            width: "2px",
            height: "48px",
            background: "var(--border-dim)",
            borderRadius: "2px",
            opacity: 0.9,
          }}
        />
      </div>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <ScenarioWorkspace item={scenarioItem} onCompleteScenario={() => onStartLab?.(item.id)} />
      </main>
    </section>
  );
}

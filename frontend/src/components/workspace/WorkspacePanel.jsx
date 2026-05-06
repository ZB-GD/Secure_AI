import { useState, useEffect } from "react";
import ScenarioWorkspace from "../scenarios/ScenarioWorkspace";
import { ScenarioOnePipelineRuntime } from "../scenarios/ScenarioWorkspace";
import LabRuntimeWorkspace from "../labs/LabRuntimeWorkspace";
import LabDashboard from "../labs/LabDashboard";
import LabScenarioIntro from "../labs/LabScenarioIntro";

export default function WorkspacePanel({
  items,
  item,
  onSelectItem,
  onCompleteScenario,
  currentStep,
  currentAnswer,
  onAnswerChange,
  onPrevStep,
  onNextStep,
  onCompleteLabQuiz,
  onStartLab,
}) {
  const [labView, setLabView] = useState("lab");

  useEffect(() => {
    if (item?.type !== "lab") return;

    if (item.scenario && !item.scenarioViewed) {
      setLabView("intro");
    } else {
      setLabView("lab");
    }
  }, [item?.id, item?.scenarioViewed, item?.scenario]);

  if (!item) return null;

  if (item.type === "dashboard") {
    return <LabDashboard items={items || []} onSelectItem={onSelectItem} />;
  }

  if (item.type === "pipeline") {
    return <ScenarioOnePipelineRuntime />;
  }

  if (item.type === "welcome") {
    return (
      <ScenarioWorkspace
        item={item}
        onCompleteScenario={onCompleteScenario}
        onSelectItem={onSelectItem}
      />
    );
  }

  if (item.type === "scenario") {
    return (
      <ScenarioWorkspace
        item={item}
        onCompleteScenario={onCompleteScenario}
        onSelectItem={onSelectItem}
      />
    );
  }

  if (item.type === "lab" && item.scenario && labView === "intro") {
    return (
      <LabScenarioIntro
        item={item}
        onStartLab={() => {
          onStartLab?.(item.id);
          setLabView("lab");
        }}
      />
    );
  }

  if (item.type === "lab" && item.scenario && labView === "pipeline") {
    const linkedScenario =
      items?.find((i) => i.id === item.id.replace("lab", "scenario")) || null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: "8px 16px",
            borderBottom: "1px solid var(--border-dim)",
            background: "var(--bg-panel)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            onClick={() => setLabView("lab")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-dim)",
              background: "var(--bg-elevated)",
              color: "var(--text-2)",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← BACK TO LAB
          </button>

          <span
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
            }}
          >
            PIPELINE REFERENCE
          </span>
        </div>

        {linkedScenario ? (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <ScenarioWorkspace
              item={linkedScenario}
              onCompleteScenario={onCompleteScenario}
              onSelectItem={onSelectItem}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-3)",
              background: "var(--bg-base)",
              fontFamily: "var(--font-mono)",
            }}
          >
            No linked scenario found.
          </div>
        )}
      </div>
    );
  }

  if (item.type === "lab") {
    const scenarioItem =
      items?.find((i) => i.id === item.id.replace("lab", "scenario")) || null;

    return (
      <LabRuntimeWorkspace
        item={item}
        scenarioItem={scenarioItem}
        currentStep={currentStep}
        currentAnswer={currentAnswer}
        onAnswerChange={onAnswerChange}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        onCompleteLabQuiz={onCompleteLabQuiz}
        onCompleteScenario={onCompleteScenario}
        onViewScenario={item.scenario ? () => setLabView("pipeline") : undefined}
      />
    );
  }

  return (
    <div style={{ padding: "20px", color: "var(--text-3)" }}>
      Select a lab to begin.
    </div>
  );
}

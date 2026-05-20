import { useState, useEffect } from "react";
import ScenarioWorkspace from "../scenarios/ScenarioWorkspace";
import LabRuntimeWorkspace from "../labs/LabRuntimeWorkspace";
import LabDashboard from "../labs/LabDashboard";
import LabScenarioIntro from "../labs/LabScenarioIntro";
import DocsPage from "../../data/DocsPage";

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
  }, [item?.id, item?.scenarioViewed, item?.scenario, item?.type]);

  if (!item) return null;

  if (item.type === "dashboard") {
    return <LabDashboard items={items || []} onSelectItem={onSelectItem} />;
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
      />
    );
  }
  // Docs page — se activa cuando item.type === "docs"
// También acepta un docPath opcional para que el tutor RAG pueda
// abrir directamente un documento concreto:
//   onSelectItem({ id: "docs", type: "docs", docPath: "/docs/data-poisoning" })

if (item.type === "docs") {
  return (
    <DocsPage initialDocPath={item.docPath || null} />
  );
}

  return (
    <div style={{ padding: "20px", color: "var(--text-3)" }}>
      Select a lab to begin.
    </div>
  );
}

import ScenarioWorkspace from "../scenarios/ScenarioWorkspace"
import LabRuntimeWorkspace from "../labs/LabRuntimeWorkspace"
import LabDashboard from "../labs/LabDashboard"
import LabScenarioIntro from "../labs/LabScenarioIntro"

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
  if (!item) return null

  if (item.type === "dashboard") {
    return <LabDashboard items={items || []} onSelectItem={onSelectItem} />
  }

  if (item.type === "scenario") {
    return (
      <ScenarioWorkspace item={item} onCompleteScenario={onCompleteScenario} />
    );
  }

  if (item.type === "lab" && item.scenario && !item.scenarioViewed) {
    return <LabScenarioIntro item={item} onStartLab={onStartLab} />
  }

  // All labs use the new unified workspace
  const scenarioItem = items?.find((i) => i.id === item.id.replace("lab", "scenario")) || null

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
  )
}

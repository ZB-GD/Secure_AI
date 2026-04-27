import ScenarioWorkspace from "../scenarios/ScenarioWorkspace"
import LabRuntimeWorkspace from "../labs/LabRuntimeWorkspace"

export default function WorkspacePanel({
  item,
  onCompleteScenario,
  currentStep,
  currentAnswer,
  onAnswerChange,
  onPrevStep,
  onNextStep,
}) {
  if (!item) return null

  if (item.type === "scenario") {
    return (
      <ScenarioWorkspace
        item={item}
        onCompleteScenario={onCompleteScenario}
      />
    )
  }

  // All labs use the new unified workspace
  return (
    <LabRuntimeWorkspace
      item={item}
      currentStep={currentStep}
      currentAnswer={currentAnswer}
      onAnswerChange={onAnswerChange}
      onPrevStep={onPrevStep}
      onNextStep={onNextStep}
    />
  )
}

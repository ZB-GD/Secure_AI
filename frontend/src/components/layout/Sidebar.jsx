import ScenarioGuide from "../scenarios/ScenarioGuide"
import LabGuide from "../labs/LabGuide"

export default function Sidebar(props) {
  const { item, width } = props

  return (
    <aside
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border-dim)",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {item.type === "scenario" ? (
          <ScenarioGuide item={item} onComplete={props.onCompleteScenario} />
        ) : (
          <LabGuide
            item={item}
            currentStep={props.currentStep}
            currentAnswer={props.currentAnswer}
            currentAnswerValid={props.currentAnswerValid}
            onAnswerChange={props.onAnswerChange}
            onPrevStep={props.onPrevStep}
            onNextStep={props.onNextStep}
          />
        )}
      </div>
    </aside>
  )
}

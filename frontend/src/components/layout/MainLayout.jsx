import TopBar from "./TopBar"
import Sidebar from "./Sidebar"
import WorkspacePanel from "../workspace/WorkspacePanel"

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
}) {
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
      <TopBar items={items} activeItem={activeItem} onSelectItem={onSelectItem} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <Sidebar
          item={activeItem}
          currentStep={currentStep}
          currentAnswer={currentAnswer}
          currentAnswerValid={currentAnswerValid}
          onCompleteScenario={onCompleteScenario}
          onAnswerChange={onAnswerChange}
          onPrevStep={onPrevStep}
          onNextStep={onNextStep}
        />
        <main style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
          <WorkspacePanel item={activeItem} />
        </main>
      </div>
    </div>
  )
}
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
  // Scenario 0 se muestra a pantalla completa sin Sidebar
  const isFullWidthBriefing = activeItem.id === "scenario-0";

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
        {!isFullWidthBriefing && (
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
        )}
        <main style={{ 
          flex: 1, 
          overflow: "hidden", 
          minWidth: 0,
          position: 'relative'
        }}>
          <WorkspacePanel 
            item={activeItem} 
            onCompleteScenario={onCompleteScenario} // Pasamos la función para el botón del intro
          />
        </main>
      </div>
    </div>
  )
}
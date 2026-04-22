import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import WorkspacePanel from "../workspace/WorkspacePanel";
import RagTutorWidget from "../workspace/RagTutorWidget";

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
  // Ignoramos el tutor en la pantalla de inicio (scenario-0) para no distraer
  const isFullWidthBriefing = activeItem.id === "scenario-0";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg-base)" }}>
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
        <main style={{ flex: 1, overflow: "hidden", minWidth: 0, position: "relative" }}>
          <WorkspacePanel item={activeItem} onCompleteScenario={onCompleteScenario} />
        </main>
      </div>

      {/* 2. AÑADE EL WIDGET AQUÍ */}
      {/* Solo aparece si no es el briefing inicial */}
      {!isFullWidthBriefing && (
        <RagTutorWidget 
          labId={activeItem?.id} 
          phase={activeItem?.phase}
          activeItem={activeItem} 
        />
      )}
    </div>
  );
}
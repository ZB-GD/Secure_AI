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
  const isFullWidthBriefing = activeItem.id === "scenario-0";
  const isScenario = activeItem.type === "scenario";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      background: "var(--bg-base)",
    }}>
      <TopBar items={items} activeItem={activeItem} onSelectItem={onSelectItem} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Sidebar only for scenarios (labs have guide inside the tabbed panel) */}
        {!isFullWidthBriefing && isScenario && (
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
          <WorkspacePanel
            item={activeItem}
            onCompleteScenario={onCompleteScenario}
            currentStep={currentStep}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
            onPrevStep={onPrevStep}
            onNextStep={onNextStep}
          />
        </main>
      </div>

      {/* Floating tutor only for scenarios — labs have it integrated in Quiz tab */}
      {!isFullWidthBriefing && isScenario && (
        <RagTutorWidget
          labId={activeItem?.id}
          phase={activeItem?.phase}
          activeItem={activeItem}
        />
      )}
    </div>
  );
}

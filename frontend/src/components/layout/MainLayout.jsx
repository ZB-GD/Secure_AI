import TopBar from "./TopBar"
import Sidebar from "./Sidebar"
import WorkspacePanel from "../workspace/WorkspacePanel"
import VulnerabilityGate from "./VulnerabilityGate"

export default function MainLayout({
  labs,
  activeLab,
  unlockedGates,
  currentStep,
  currentAnswer,
  currentAnswerValid,
  onSelectLab,
  onUnlockLab,
  onAnswerChange,
  onPrevStep,
  onNextStep,
  labUnlocked,
}) {
  const showGate = !!activeLab.gate && !labUnlocked

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden text-[var(--text-primary)]">
      <TopBar
        labs={labs}
        activeLab={activeLab}
        unlockedGates={unlockedGates}
        onSelectLab={onSelectLab}
      />

      <div className="flex min-h-0 flex-1 px-3 pb-3 pt-2 overflow-hidden">
        {showGate ? (
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <VulnerabilityGate lab={activeLab} onUnlock={onUnlockLab} />
          </main>
        ) : (
          <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
            <Sidebar
              lab={activeLab}
              currentStep={currentStep}
              currentAnswer={currentAnswer}
              currentAnswerValid={currentAnswerValid}
              onAnswerChange={onAnswerChange}
              onPrevStep={onPrevStep}
              onNextStep={onNextStep}
            />

            <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <WorkspacePanel lab={activeLab} />
            </main>
          </div>
        )}
      </div>
    </div>
  )
}
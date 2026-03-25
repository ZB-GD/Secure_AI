import TopBar from "./TopBar"
import Sidebar from "./Sidebar"
import WorkspacePanel from "../workspace/WorkspacePanel"

export default function MainLayout({
  labs,
  activeLab,
  onSelectLab,
  onTerminalCommand,
  onGoNext,
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--bg-base)] text-slate-100">
      <TopBar labs={labs} activeLab={activeLab} onSelectLab={onSelectLab} />

      <div className="flex flex-1 min-h-0 gap-4 px-4 pb-4 pt-4">
        <Sidebar
          lab={activeLab}
          onGoNext={onGoNext}
          canGoNext={activeLab.completed}
        />

        <main className="min-w-0 flex-1">
          <WorkspacePanel
            lab={activeLab}
            onTerminalCommand={onTerminalCommand}
          />
        </main>
      </div>
    </div>
  )
}
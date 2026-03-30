import PipelineStatus from "../labs/PipelineStatus"

export default function TopBar({ labs, activeLab, unlockedGates, onSelectLab }) {
  const completedLabs = labs.filter((lab) => lab.completed).length

  return (
    <header className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)]/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-3 py-2.5">
        <div className="min-w-[210px]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-sm font-semibold text-blue-300">
              AI
            </div>

            <div>
              <h1 className="text-base font-semibold text-[var(--text-primary)]">
                Secure AI Pipeline
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Plataforma de laboratorios
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 justify-center">
          <PipelineStatus
            labs={labs}
            unlockedGates={unlockedGates}
            activeLabId={activeLab.id}
          />
        </div>

        <div className="min-w-[180px] text-right">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Laboratorios completados
          </p>
          <p className="mt-0.5 text-xl font-semibold text-[var(--text-primary)]">
            {completedLabs}
            <span className="text-[var(--text-muted)]">/{labs.length}</span>
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {labs.map((lab, index) => {
            const isUnlocked = unlockedGates[lab.id]
            const status = lab.completed
              ? "Completado"
              : lab.locked
              ? "Bloqueado"
              : isUnlocked
              ? "Disponible"
              : "Identificar"

            const visibleTitle =
              isUnlocked || lab.completed ? lab.shortTitle : `Laboratorio ${index + 1}`

            return (
              <button
                key={lab.id}
                onClick={() => onSelectLab(lab.id)}
                disabled={lab.locked}
                className={`rounded-2xl border px-3 py-2 text-left transition ${
                  activeLab.id === lab.id
                    ? "border-blue-400/25 bg-blue-500/10"
                    : "border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-panel-soft)]"
                } ${lab.locked ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-300">
                    L{index + 1}
                  </span>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                      lab.completed
                        ? "bg-emerald-500/10 text-emerald-300"
                        : lab.locked
                        ? "bg-slate-800 text-slate-500"
                        : isUnlocked
                        ? "bg-blue-500/10 text-blue-300"
                        : "bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {visibleTitle}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
import PipelineStatus from "../labs/PipelineStatus"

function getBadgeClass(lab, activeLabId) {
  if (!lab.unlocked && !lab.completed) {
    return "border-slate-800 bg-slate-950 text-slate-600 cursor-not-allowed"
  }

  if (lab.completed) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
  }

  if (lab.id === activeLabId) {
    return "border-amber-500/50 bg-amber-500/10 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
  }

  return "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"
}

export default function TopBar({ labs, activeLab, onSelectLab }) {
  const securedCount = labs.filter((lab) => lab.completed).length

  return (
    <header className="border-b border-[var(--border)] bg-[linear-gradient(180deg,rgba(12,18,34,0.98)_0%,rgba(10,14,26,0.98)_100%)] px-4 py-3 mb-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.08)]">
            <span className="font-mono text-sm font-bold tracking-wide text-amber-300">AI</span>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-slate-500">Secure AI Pipeline</p>
            <h1 className="text-lg font-semibold text-slate-100">SecLabs Control Room</h1>
          </div>
        </div>

        <div className="flex min-w-[360px] flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-400">
            <span>laboratorios asegurados</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-slate-200">{securedCount}/4</span>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {labs.map((lab, index) => (
              <button
                key={lab.id}
                onClick={() => onSelectLab(lab.id)}
                disabled={!lab.unlocked && !lab.completed}
                className={`rounded-lg border px-3 py-2 text-left transition-all ${getBadgeClass(lab, activeLab.id)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px]">L{index + 1}</span>
                  <span className="text-[10px] uppercase tracking-wide">
                    {lab.completed ? "secured" : lab.unlocked ? "infected" : "locked"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-none">{lab.title}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[rgba(9,14,28,0.85)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">pipeline exposure map</p>
            <h2 className="text-sm font-medium text-slate-200">{activeLab.phase}</h2>
          </div>
          <div className="rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-[11px] text-amber-200">
            Amenaza activa en <span className="font-mono">{activeLab.threatStage}</span>
          </div>
        </div>

        <PipelineStatus labs={labs} activeLabId={activeLab.id} />
      </div>
    </header>
  )
}
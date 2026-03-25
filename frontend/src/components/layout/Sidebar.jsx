import LabGuide from "../labs/LabGuide"

export default function Sidebar({ lab, onGoNext, canGoNext }) {
  return (
    <aside className="flex min-w-[420px] max-w-[520px] flex-[0_0_42%] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-panel)] shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">guía operativa</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">Playbook del alumno</h2>
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${lab.completed ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
            {lab.completed ? "Laboratorio asegurado" : "Laboratorio comprometido"}
          </div>
        </div>
      </div>

      <LabGuide lab={lab} onGoNext={onGoNext} canGoNext={canGoNext} />
    </aside>
  )
}
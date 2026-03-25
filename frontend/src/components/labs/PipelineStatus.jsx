import { STAGES } from "../../data/pipelineStages"

export default function PipelineStatus({ labs, activeLabId }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {STAGES.map((stage, index) => {
        const lab = labs.find((item) => item.threatStage === stage.id)
        const active = lab?.id === activeLabId
        const secured = lab?.completed

        return (
          <div key={stage.id} className="flex items-center gap-3">
            <div className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 transition-all ${active ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_24px_rgba(251,146,60,0.08)]" : secured ? "border-emerald-500/30 bg-emerald-500/10" : "border-slate-800 bg-slate-950/75"}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-sm font-bold ${secured ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : active ? "border-amber-400/40 bg-amber-500/20 text-amber-200" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
                  {stage.id}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${secured ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                  {secured ? "secure" : "infected"}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-100">{stage.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{stage.full}</p>
            </div>

            {index < STAGES.length - 1 && (
              <div className={`hidden h-px w-6 lg:block ${secured ? "bg-emerald-500/40" : "bg-slate-800"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
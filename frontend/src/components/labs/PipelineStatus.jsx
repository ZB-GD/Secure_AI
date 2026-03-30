import { STAGES } from "../../data/pipelineStages"

export default function PipelineStatus({ labs, unlockedGates, activeLabId }) {
  return (
    <div className="grid w-full max-w-[980px] grid-cols-4 gap-3">
      {STAGES.map((stage, index) => {
        const lab = labs[index]
        const isActive = lab.id === activeLabId

        const state = lab.completed
          ? "secure"
          : lab.locked
          ? "locked"
          : unlockedGates[lab.id]
          ? "ready"
          : "analysis"

        const stateStyles =
          state === "secure"
            ? "border-emerald-200 bg-emerald-50"
            : state === "locked"
            ? "border-slate-200 bg-slate-50"
            : state === "ready"
            ? "border-blue-200 bg-blue-50"
            : "border-amber-200 bg-amber-50"

        const badgeStyles =
          state === "secure"
            ? "bg-emerald-100 text-emerald-700"
            : state === "locked"
            ? "bg-slate-100 text-slate-500"
            : state === "ready"
            ? "bg-blue-100 text-blue-700"
            : "bg-amber-100 text-amber-700"

        const label =
          state === "secure"
            ? "Seguro"
            : state === "locked"
            ? "Bloqueado"
            : state === "ready"
            ? "Disponible"
            : "Analizar"

        return (
          <div
            key={stage.id}
            className={`rounded-2xl border p-3 transition ${stateStyles} ${
              isActive ? "ring-2 ring-blue-200" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800">
                {stage.id}
              </div>

              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeStyles}`}>
                {label}
              </span>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {stage.title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {stage.description}
            </p>
          </div>
        )
      })}
    </div>
  )
}
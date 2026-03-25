import { useEffect, useMemo, useState } from "react"

export default function LabGuide({ lab, onGoNext, canGoNext }) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setStepIndex(0)
  }, [lab.id])

  const currentStep = lab.steps[stepIndex]
  const progress = useMemo(() => Math.round(((stepIndex + 1) / lab.steps.length) * 100), [stepIndex, lab.steps.length])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{lab.phase}</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-50">{lab.title}</h3>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${lab.difficulty === "hard" ? "border-red-500/25 bg-red-500/10 text-red-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300"}`}>
            {lab.difficulty}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">objetivo</p>
            <p className="leading-relaxed">{lab.guide.objective}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">resultado esperado</p>
            <p className="leading-relaxed">Completar los comandos críticos y dejar la etapa {lab.threatStage} en estado seguro.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">paso {stepIndex + 1} de {lab.steps.length}</p>
            <h4 className="mt-1 text-xl font-semibold text-slate-100">{currentStep.title}</h4>
          </div>
          <div className="min-w-[130px]">
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span>avance guía</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(16,24,46,0.9)_0%,rgba(10,14,26,0.98)_100%)] p-5 shadow-[0_12px_50px_rgba(0,0,0,0.22)]">
          <div className="mb-4 inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-amber-200">
            {currentStep.tag}
          </div>

          <p className="text-base leading-7 text-slate-200">{currentStep.description}</p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">qué debe hacer el alumno</p>
              <p className="text-sm leading-6 text-slate-300">{currentStep.action}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">pista operativa</p>
              <p className="text-sm leading-6 text-slate-400">{currentStep.hint}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">comandos de verificación</p>
          <div className="space-y-2">
            {lab.requiredCommands.map((command) => {
              const done = lab.runCommands.includes(command)
              return (
                <div key={command} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                  <span className="font-mono text-slate-200">{command}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${done ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-900 text-slate-500"}`}>
                    {done ? "hecho" : "pendiente"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-6 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            disabled={stepIndex === 0}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>

          <button
            onClick={() => setStepIndex((value) => Math.min(lab.steps.length - 1, value + 1))}
            disabled={stepIndex === lab.steps.length - 1}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>

        <button
          onClick={onGoNext}
          disabled={!canGoNext}
          className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600"
        >
          {canGoNext ? "Abrir siguiente laboratorio" : "Completa este laboratorio para desbloquear el siguiente"}
        </button>
      </div>
    </div>
  )
}
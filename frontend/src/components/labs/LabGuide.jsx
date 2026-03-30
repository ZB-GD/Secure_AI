function stepAnswerLooksValid(step, answer) {
  const value = (answer || "").toLowerCase().trim()
  if (!value) return false
  return (step.expectedKeywords || []).some((keyword) =>
    value.includes(keyword.toLowerCase())
  )
}

export default function LabGuide({
  lab,
  currentStep,
  currentAnswer,
  currentAnswerValid,
  onAnswerChange,
  onPrevStep,
  onNextStep,
}) {
  if (!lab || !lab.guide || !lab.guide.steps || !currentStep) {
  return (
    <div className="p-6 text-slate-600">
      <h2 className="text-xl font-semibold">La guía aún no está lista</h2>
      <p className="mt-2 text-sm">
        Falta definir <code>guide.steps</code> en el laboratorio activo o no se está
        pasando correctamente <code>currentStep</code>.
      </p>
    </div>
  )
}
  const progress = Math.round(
    ((lab.currentStepIndex + 1) / lab.guide.steps.length) * 100
  )

  const visibleRefs =
    currentStep.referenceKeys?.length > 0
      ? lab.references.filter((ref) => currentStep.referenceKeys.includes(ref.id))
      : lab.references

  const answerValid = stepAnswerLooksValid(currentStep, currentAnswer)

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-slate-500">
              {lab.phase}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-100">
              {lab.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{lab.subtitle}</p>
          </div>

          <div className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-orange-300">
            {lab.difficulty}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-500">
              Objetivo
            </p>
            <p className="mt-3 text-base leading-7 text-slate-200">
              {lab.guide.objective}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-500">
              Resultado esperado
            </p>
            <p className="mt-3 text-base leading-7 text-slate-200">
              {lab.guide.expectedResult}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-500">
                Paso {lab.currentStepIndex + 1} de {lab.guide.steps.length}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-100">
                {currentStep.title}
              </h3>
            </div>

            <div className="min-w-[120px]">
              <p className="text-right text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">
                avance guía
              </p>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-orange-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-right text-sm text-slate-400">{progress}%</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-orange-300">
              Contexto del paso
            </p>
            <p className="mt-3 text-lg leading-8 text-slate-200">
              {currentStep.body}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-500">
              Qué tiene que detectar el alumno
            </p>
            <p className="mt-3 text-base leading-7 text-slate-200">
              {currentStep.observation}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-500">
              Pregunta corta de seguimiento
            </p>
            <p className="mt-3 text-base font-medium text-slate-100">
              {currentStep.question}
            </p>

            <textarea
              value={currentAnswer}
              onChange={(e) => onAnswerChange(currentStep.id, e.target.value)}
              placeholder={currentStep.placeholder}
              className="mt-4 min-h-[88px] w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Pista: la respuesta debe contener alguna palabra clave del análisis que
                estás viendo en este paso.
              </p>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] ${
                  answerValid
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {answerValid ? "respuesta válida" : "pendiente"}
              </span>
            </div>

            {lab.showValidation && !currentAnswerValid && (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                Tu respuesta aún no recoge una evidencia clave del paso. Revisa la VM o
                la referencia y vuelve a intentarlo.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-500">
              Referencias fiables para este paso
            </p>

            <div className="mt-4 space-y-3">
              {visibleRefs.map((ref) => (
                <a
                  key={ref.id}
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 transition hover:border-slate-600"
                >
                  <p className="text-sm font-semibold text-slate-100">{ref.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{ref.note}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 bg-slate-950 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onPrevStep}
            disabled={lab.currentStepIndex === 0}
            className="rounded-2xl border border-slate-800 px-4 py-3 text-sm text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>

          <button
            onClick={onNextStep}
            className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-5 py-3 text-sm font-medium text-orange-200"
          >
            {lab.currentStepIndex === lab.guide.steps.length - 1
              ? "Marcar laboratorio como completado"
              : "Siguiente"}
          </button>
        </div>

        {!lab.completed && (
          <p className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-center text-sm text-slate-400">
            Completa la guía y responde las preguntas clave para desbloquear el siguiente
            laboratorio.
          </p>
        )}

        {lab.completed && (
          <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
            Laboratorio completado. Ya puedes pasar al siguiente.
          </p>
        )}
      </div>
    </div>
  )
}
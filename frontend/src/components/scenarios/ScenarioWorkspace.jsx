function EvidenceCard({ title, items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-slate-500">
        {title}
      </p>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ScenarioWorkspace({ item }) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-slate-500">
          Investigation workspace
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          Narrative evidence review
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          This area simulates the information the learner can inspect before entering the lab.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-4">
        <EvidenceCard title="Inputs" items={item.evidence.inputs} />
        <EvidenceCard title="Files" items={item.evidence.files} />
        <EvidenceCard title="Prompts" items={item.evidence.prompts} />
        <EvidenceCard title="Logs" items={item.evidence.logs} />
      </div>
    </section>
  )
}
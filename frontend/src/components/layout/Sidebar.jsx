import LabGuide from "../labs/LabGuide"

export default function Sidebar(props) {
  return (
    <aside className="flex h-full min-h-0 w-[37%] min-w-[390px] max-w-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="shrink-0 border-b border-slate-200 px-5 py-4">
        <span className="text-[11px] font-mono uppercase tracking-[0.35em] text-slate-500">
          Guía del laboratorio
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <LabGuide {...props} />
      </div>
    </aside>
  )
}
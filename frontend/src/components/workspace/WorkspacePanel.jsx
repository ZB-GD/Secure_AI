import { useState } from "react"
import TerminalEmulator from "./TerminalEmulator"

export default function WorkspacePanel({ lab, onTerminalCommand }) {
  const [activeTab, setActiveTab] = useState("terminal")

  const tabs = [
    { id: "terminal", label: "Terminal" },
    { id: "logs", label: "Logs" },
    { id: "files", label: "Files" },
  ]

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-panel)] shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">workspace</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-100">Mitigación en entorno aislado</h3>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] text-slate-400">
            Comandos completados: <span className="font-mono text-slate-200">{lab.progress}/{lab.progressTotal}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${activeTab === tab.id ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6">
        {activeTab === "terminal" && <TerminalEmulator lab={lab} onCommandRun={onTerminalCommand} />}

        {activeTab === "logs" && (
          <div className="h-full overflow-y-auto rounded-3xl border border-slate-800 bg-[#050a14] p-5 font-mono text-sm text-slate-300">
            <p className="mb-4 text-xs uppercase tracking-[0.24em] text-slate-500">event stream</p>
            <div className="space-y-3">
              {lab.logs.map((line, index) => (
                <div key={index} className="rounded-xl border border-slate-900 bg-slate-950/70 px-4 py-3">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="grid h-full min-h-0 grid-cols-[240px_minmax(0,1fr)] gap-4">
            <div className="overflow-y-auto rounded-3xl border border-slate-800 bg-[#050a14] p-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-slate-500">files</p>
              <div className="space-y-2">
                {lab.files.map((file) => (
                  <div key={file.name} className="rounded-xl border border-slate-900 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto rounded-3xl border border-slate-800 bg-[#050a14] p-5">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-slate-500">preview</p>
              <pre className="whitespace-pre-wrap font-mono text-sm leading-6 text-slate-300">
                {lab.files[0]?.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
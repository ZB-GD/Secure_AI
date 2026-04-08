import { vmService } from "../../services/vmService"

export default function RemoteDesktopPanel({ item }) {
  const remoteUrl = vmService.getRemoteUrl(item)

  if (!remoteUrl) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <header className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-slate-500">
              Remote environment
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {item.envKey} · {item.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Backend integration pending
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex h-full w-full max-w-4xl items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-center">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-500">
                VM
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-800">
                Remote environment placeholder
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                This panel is ready for backend integration. Your teammate can later connect the VM or runtime here without changing the narrative flow of the frontend.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <header className="shrink-0 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-slate-500">
              Remote environment
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {item.envKey} · {item.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Live lab runtime
            </p>
          </div>

          <a
            href={remoteUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:border-slate-300"
          >
            Open in new tab
          </a>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <iframe
            title={`Remote desktop ${item.id}`}
            src={remoteUrl}
            className="h-full w-full rounded-xl bg-white"
          />
        </div>
      </div>
    </section>
  )
}
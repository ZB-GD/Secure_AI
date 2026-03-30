import { vmService } from "../../services/vmService";

export default function RemoteDesktopPanel({
  lab,
  remoteUrl: runtimeRemoteUrl,
  remoteLoading,
  remoteError,
  onRetryRemoteStart,
}) {
  const remoteUrl = vmService.getRemoteUrl(lab, runtimeRemoteUrl);

  if (remoteLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <p className="text-sm">Iniciando entorno remoto...</p>
        <p className="text-xs text-slate-400">
          Esto puede tardar unos segundos.
        </p>
      </div>
    );
  }

  if (remoteError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border border-rose-200 bg-rose-50 px-6 text-center text-rose-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-medium">
          No se pudo abrir el escritorio remoto.
        </p>
        <p className="text-xs">{remoteError}</p>
        <button
          type="button"
          onClick={onRetryRemoteStart}
          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-medium hover:bg-rose-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!remoteUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        La VM todavía no tiene una URL remota configurada.
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <header className="shrink-0 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-slate-500">
              Entorno remoto
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {lab.envKey} · {lab.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              VM limpia o vulnerable según el laboratorio activo.
            </p>
          </div>

          <a
            href={remoteUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:border-slate-300"
          >
            Abrir en pestaña
          </a>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <iframe
            title={`Remote desktop ${lab.id}`}
            src={remoteUrl}
            className="h-full w-full rounded-xl bg-white"
          />
        </div>
      </div>
    </section>
  );
}

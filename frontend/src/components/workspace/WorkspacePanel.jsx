import RemoteDesktopPanel from "./RemoteDesktopPanel";

export default function WorkspacePanel({
  lab,
  remoteUrl,
  remoteLoading,
  remoteError,
  onRetryRemoteStart,
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <RemoteDesktopPanel
          lab={lab}
          remoteUrl={remoteUrl}
          remoteLoading={remoteLoading}
          remoteError={remoteError}
          onRetryRemoteStart={onRetryRemoteStart}
        />
      </div>
    </section>
  );
}

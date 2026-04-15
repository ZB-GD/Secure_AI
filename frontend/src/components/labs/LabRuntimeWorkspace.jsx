import RemoteDesktopPanel from "../workspace/RemoteDesktopPanel";
import AttackControls from "./AttackControls";
import LabMetrics from "./LabMetrics";
import RuntimeLogsPanel from "./RuntimeLogsPanel";
import { useLabRuntime } from "../../hooks/useLabRuntime";

export default function LabRuntimeWorkspace({ item }) {
  const {
    remoteUrl,
    remoteLoading,
    remoteError,
    retryRuntime,
    triggerAttack,
    attackLoading,
    runtime,
    logs,
  } = useLabRuntime(item?.id, {
    autoStart: true,
    pollIntervalMs: 3000,
    logPollIntervalMs: 1200,
    logLimit: 200,
  });

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: "16px",
        height: "100%",
        padding: "16px",
        background: "var(--bg-base)",
      }}
    >
      <div style={{ minWidth: 0, minHeight: 0 }}>
        <RemoteDesktopPanel
          item={item}
          remoteUrl={remoteUrl}
          remoteLoading={remoteLoading}
          remoteError={remoteError}
          onRetry={retryRuntime}
        />
      </div>

      <div
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
          gap: "12px",
        }}
      >
        <AttackControls onAttack={triggerAttack} loading={attackLoading} />

        <LabMetrics
          driftScore={runtime.driftScore}
          accuracy={runtime.accuracy}
          isCompromised={runtime.isCompromised}
          statusLabel={runtime.statusLabel}
          lastEvent={runtime.lastEvent}
        />

        <div style={{ minHeight: 0 }}>
          <RuntimeLogsPanel
            lines={logs}
            statusLabel={runtime.statusLabel}
          />
        </div>
      </div>
    </section>
  );
}
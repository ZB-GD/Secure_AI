import { useCallback, useEffect, useState } from "react";
import { labService } from "../services/labService";

const DEFAULT_RUNTIME = {
  statusLabel:   "waiting",
  driftScore:    12,
  accuracy:      98.5,
  isCompromised: false,
  lastEvent:     "Local Lab 1 target is waiting for an attack.",
  acceptedReadings: 0,
  rejectedReadings: 0,
  attackAttempts: 0,
  defenseEnabled: false,
  defenseCoverage: 0,
  mode: "vulnerable",
  downstreamRisk: "low",
  lastReason: "",
  congestionScore: "n/a",
  attackTarget: "127.0.0.1:5000/ingest",
  poisonedValue: "none",
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Convert /labs/{stage}/status into a runtime snapshot.
function buildRuntimeFromStatus(payload, previous = DEFAULT_RUNTIME) {
  const metrics = payload?.metrics || {};
  const nextStatus = payload?.status || metrics?.status || previous.statusLabel || "running";
  return {
    ...previous,
    statusLabel:   previous.isCompromised && nextStatus === "running" ? "compromised" : nextStatus,
    driftScore:    toNumber(metrics?.drift_score ?? payload?.drift_score, previous.driftScore),
    accuracy:      toNumber(metrics?.accuracy ?? payload?.accuracy, previous.accuracy),
    isCompromised: Boolean(metrics?.compromised ?? payload?.compromised ?? previous.isCompromised),
    lastEvent:     payload?.last_event || metrics?.last_event || previous.lastEvent,
    attackAttempts: toNumber(metrics?.attack_attempts, previous.attackAttempts),
    acceptedReadings: toNumber(metrics?.accepted_readings, previous.acceptedReadings),
    rejectedReadings: toNumber(metrics?.rejected_readings, previous.rejectedReadings),
    defenseEnabled: Boolean(metrics?.defense_enabled ?? previous.defenseEnabled),
    defenseCoverage: toNumber(metrics?.defense_coverage, previous.defenseCoverage),
    mode: metrics?.mode || previous.mode,
    downstreamRisk: metrics?.downstream_risk || previous.downstreamRisk,
    lastReason: metrics?.last_reason || previous.lastReason,
    congestionScore: metrics?.congestion_score ?? previous.congestionScore,
  };
}

function buildRuntimeFromLogs(lines = [], previous = DEFAULT_RUNTIME) {
  const text = lines.join("\n");
  const attackAccepted =
    text.includes("[RESULT] ATTACK SUCCESSFUL") ||
    text.includes("[NODE-1] ACCEPTED traffic_volume=-5000") ||
    text.includes("traffic_volume = -5000");
  const attackBlocked =
    text.includes("[RESULT] ATTACK BLOCKED") ||
    text.includes("[NODE-1] REJECTED traffic_volume=-5000");

  const congestionMatch = text.match(/congestion_score[=\s]+(-?\d+(?:\.\d+)?)/);
  const acceptedMatches = text.match(/\[NODE-1\] ACCEPTED traffic_volume=/g) || [];
  const rejectedMatches = text.match(/\[NODE-1\] REJECTED traffic_volume=/g) || [];

  if (attackBlocked) {
    return {
      ...previous,
      statusLabel: "protected",
      driftScore: 8,
      accuracy: 96,
      isCompromised: false,
      rejectedReadings: Math.max(previous.rejectedReadings || 0, rejectedMatches.length || 1),
      attackAttempts: Math.max(
        previous.attackAttempts || 0,
        (acceptedMatches.length || 0) + (rejectedMatches.length || 1),
      ),
      defenseEnabled: true,
      defenseCoverage: Math.max(previous.defenseCoverage || 0, 1),
      mode: "protected",
      downstreamRisk: "reduced",
      congestionScore: congestionMatch?.[1] || previous.congestionScore || "-0.625",
      poisonedValue: "traffic_volume=-5000",
    };
  }

  if (!attackAccepted) {
    return {
      ...previous,
      statusLabel: previous.statusLabel === "not found" ? "not found" : "running",
    };
  }

  return {
    ...previous,
    statusLabel: "compromised",
    driftScore: 28,
    accuracy: 61.5,
    isCompromised: true,
    acceptedReadings: Math.max(previous.acceptedReadings || 0, acceptedMatches.length || 1),
    attackAttempts: Math.max(previous.attackAttempts || 0, acceptedMatches.length || 1),
    mode: previous.mode || "vulnerable",
    downstreamRisk: "high",
    congestionScore: congestionMatch?.[1] || "-0.625",
    poisonedValue: "traffic_volume=-5000",
  };
}

export function useLabRuntime(labId, options = {}) {
  const {
    autoStart        = true,
    pollIntervalMs   = 5000,   // refresca estado del runtime
    logPollIntervalMs = 5000,
    logLimit         = 200,
  } = options;

  const [remoteUrl,     setRemoteUrl]     = useState("");
  const [remoteLoading, setRemoteLoading] = useState(Boolean(autoStart));
  const [remoteError,   setRemoteError]   = useState("");
  const [attackLoading, setAttackLoading] = useState(false);
  const [runtime,       setRuntime]       = useState(DEFAULT_RUNTIME);
  const [logs,          setLogs]          = useState([]);

  // Refresh isolated runtime status.
  const refreshStatus = useCallback(async () => {
    if (!labId) return;
    try {
      const payload = await labService.getStatusById(labId);
      if (!payload) return;

      if (payload?.status === "not found") {
        setRemoteUrl("");
      }

      if (payload?.terminal_url) {
        setRemoteUrl(payload.terminal_url);
      }
      setRuntime((prev) => buildRuntimeFromStatus(payload, prev));
    } catch {
      /* silencioso */
    }
  }, [labId]);

  // Read logs from the isolated lab container.
  const refreshLogs = useCallback(async () => {
    if (!labId) return;
    try {
      const data = await labService.getLogsById(labId, logLimit);
      const nextLogs = Array.isArray(data?.lines) ? data.lines.slice(-logLimit) : [];
      setLogs(nextLogs);
      setRuntime((prev) => buildRuntimeFromLogs(nextLogs, prev));
    } catch {
      setLogs([]);
    }
  }, [labId, logLimit]);

  // Start the container and get the remote URL.
  const startRuntime = useCallback(async () => {
    if (!labId) return;
    setRemoteLoading(true);
    setRemoteError("");

    try {
      const payload = await labService.startLabById(labId);
      setRemoteUrl(payload?.terminal_url || "");

      // Load isolated runtime status and logs.
      await Promise.all([refreshStatus(), refreshLogs()]);
    } catch (error) {
      setRemoteError(error?.message || "Unable to start remote runtime.");
    } finally {
      setRemoteLoading(false);
    }
  }, [labId, refreshLogs, refreshStatus]);

  const retryRuntime = useCallback(async () => {
    setRemoteUrl("");
    setRemoteError("");
    setLogs([]);
    await startRuntime();
  }, [startRuntime]);

  // The attack runs from the VM; this only refreshes data.
  const triggerAttack = useCallback(async () => {
    if (!labId) return null;
    setAttackLoading(true);
    try {
      await labService.triggerAttackById(labId);
      await refreshLogs();
    } finally {
      setAttackLoading(false);
    }
  }, [labId, refreshLogs]);

  // Initial startup.
  useEffect(() => {
    setRemoteUrl("");
    setRemoteError("");
    setLogs([]);
    setRuntime(DEFAULT_RUNTIME);

    if (autoStart && labId) startRuntime();
    // startRuntime identity changes whenever labId changes (same trigger), so
    // listing it would double-fire the effect. labId + autoStart are sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId, autoStart]);

  // Recover when a redeploy or cleanup stops the disposable lab while the page
  // remains open. Otherwise noVNC keeps reconnecting to a dead host port.
  useEffect(() => {
    if (!autoStart || !labId || remoteLoading || remoteError) return;
    if (runtime.statusLabel === "not found") startRuntime();
  }, [autoStart, labId, remoteLoading, remoteError, runtime.statusLabel, startRuntime]);

  // Poll isolated container logs.
  useEffect(() => {
    if (!labId) return;
    const timer = window.setInterval(refreshLogs, logPollIntervalMs);
    return () => window.clearInterval(timer);
  }, [labId, logPollIntervalMs, refreshLogs]);

  // Poll runtime status and VM URL.
  useEffect(() => {
    if (!labId) return;
    const timer = window.setInterval(refreshStatus, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [labId, pollIntervalMs, refreshStatus]);

  // Keep disposable lab containers alive only while the browser session is active.
  useEffect(() => {
    if (!labId) return;

    const sendHeartbeat = () => {
      labService.heartbeatLabById(labId).catch(() => {});
    };

    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 60_000);
    return () => window.clearInterval(timer);
  }, [labId]);

  // Browser-scoped runtime: closing or navigating away from the page discards
  // the lab container instead of preserving progress for a later visit.
  useEffect(() => {
    if (!labId) return;

    const stopRuntime = () => {
      labService.stopLabById(labId, { keepalive: true }).catch(() => {});
    };

    window.addEventListener("pagehide", stopRuntime);
    return () => window.removeEventListener("pagehide", stopRuntime);
  }, [labId]);

  return {
    remoteUrl,
    remoteLoading,
    remoteError,
    retryRuntime,
    refreshStatus,
    triggerAttack,
    attackLoading,
    runtime,
    logs,
  };
}

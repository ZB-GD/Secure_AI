import { useCallback, useEffect, useState } from "react";
import { labService } from "../services/labService";

const DEFAULT_RUNTIME = {
  statusLabel:   "running",
  driftScore:    12,
  accuracy:      98.5,
  isCompromised: false,
  lastEvent:     "Waiting for pipeline data...",
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Convierte la respuesta de /labs/{stage}/status en snapshot de runtime
// (solo se usa para obtener la remoteUrl del contenedor)
function buildRuntimeFromStatus(payload) {
  const metrics = payload?.metrics || {};
  return {
    statusLabel:   payload?.status || metrics?.status || "running",
    driftScore:    toNumber(metrics?.drift_score ?? payload?.drift_score, 12),
    accuracy:      toNumber(metrics?.accuracy ?? payload?.accuracy, 98.5),
    isCompromised: Boolean(metrics?.compromised ?? payload?.compromised ?? false),
    lastEvent:     payload?.last_event || metrics?.last_event || "No events yet.",
  };
}

export function useLabRuntime(labId, options = {}) {
  const {
    autoStart        = true,
    pollIntervalMs   = 5000,   // refresca estado del runtime
    logPollIntervalMs = 5000,  // refresca logs del contenedor aislado
    logLimit         = 200,
  } = options;

  const [remoteUrl,     setRemoteUrl]     = useState("");
  const [remoteLoading, setRemoteLoading] = useState(Boolean(autoStart));
  const [remoteError,   setRemoteError]   = useState("");
  const [attackLoading, setAttackLoading] = useState(false);
  const [runtime,       setRuntime]       = useState(DEFAULT_RUNTIME);
  const [logs,          setLogs]          = useState([]);

  // ── Refresca estado del runtime aislado ───────────────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!labId) return;
    try {
      const payload = await labService.getStatusById(labId);
      if (!payload) return;

      if (payload?.terminal_url) {
        setRemoteUrl(payload.terminal_url);
      }
      setRuntime((prev) => ({
        ...prev,
        ...buildRuntimeFromStatus(payload),
      }));
    } catch {
      /* silencioso */
    }
  }, [labId]);

  // ── Lee logs del contenedor aislado del laboratorio ─────────────────────
  const refreshLogs = useCallback(async () => {
    if (!labId) return;
    try {
      const data = await labService.getLogsById(labId, logLimit);
      setLogs(Array.isArray(data?.lines) ? data.lines.slice(-logLimit) : []);
    } catch {
      setLogs([]);
    }
  }, [labId, logLimit]);

  // ── Arrancar el contenedor y obtener URL ─────────────────────────────────
  const startRuntime = useCallback(async () => {
    if (!labId) return;
    setRemoteLoading(true);
    setRemoteError("");

    try {
      const payload = await labService.startLabById(labId);
      setRemoteUrl(payload?.terminal_url || "");

      // Cargar estado y logs del contenedor aislado
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

  // ── El ataque ahora se ejecuta desde la VM — solo refrescamos datos ──────
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

  // ── Arranque inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    setRemoteUrl("");
    setRemoteError("");
    setLogs([]);
    setRuntime(DEFAULT_RUNTIME);

    if (autoStart && labId) startRuntime();
  }, [labId, autoStart, startRuntime]);

  // ── Polling: logs del contenedor aislado ─────────────────────────────────
  useEffect(() => {
    if (!labId) return;
    const timer = window.setInterval(refreshLogs, logPollIntervalMs);
    return () => window.clearInterval(timer);
  }, [labId, logPollIntervalMs, refreshLogs]);

  // ── Polling: estado del runtime y URL de la VM ───────────────────────────
  useEffect(() => {
    if (!labId) return;
    const timer = window.setInterval(refreshStatus, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [labId, pollIntervalMs, refreshStatus]);

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

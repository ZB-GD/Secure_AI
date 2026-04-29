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
    pollIntervalMs   = 5000,   // cada 5s refresca métricas del pipeline
    logPollIntervalMs = 5000,  // cada 5s refresca logs del pipeline
    logLimit         = 200,
  } = options;

  const [remoteUrl,     setRemoteUrl]     = useState("");
  const [remoteLoading, setRemoteLoading] = useState(Boolean(autoStart));
  const [remoteError,   setRemoteError]   = useState("");
  const [attackLoading, setAttackLoading] = useState(false);
  const [runtime,       setRuntime]       = useState(DEFAULT_RUNTIME);
  const [logs,          setLogs]          = useState([]);

  // ── Refresca métricas Y logs del pipeline real ───────────────────────────
  const refreshPipeline = useCallback(async () => {
    if (!labId) return;
    try {
      const data = await labService.getPipelineData(labId);
      if (!data) return;

      if (data.snapshot && Object.keys(data.snapshot).length > 0) {
        setRuntime(prev => ({ ...prev, ...data.snapshot }));
      }
      if (Array.isArray(data.logs) && data.logs.length > 0) {
        setLogs(data.logs.slice(-logLimit));
      }
    } catch { /* silencioso */ }
  }, [labId, logLimit]);

  // ── Obtiene la URL de la VM del contenedor Docker ────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!labId) return null;
    try {
      const payload = await labService.getStatusById(labId);
      if (payload?.terminal_url) setRemoteUrl(payload.terminal_url);
      return payload;
    } catch {
      return null;
    }
  }, [labId]);

  // ── Mantener compatibilidad — ahora refresca pipeline en lugar de logs ───
  const refreshLogs = useCallback(async () => {
    await refreshPipeline();
  }, [refreshPipeline]);

  // ── Arrancar el contenedor y obtener URL ─────────────────────────────────
  const startRuntime = useCallback(async () => {
    if (!labId) return;
    setRemoteLoading(true);
    setRemoteError("");

    try {
      const payload = await labService.startLabById(labId);
      setRemoteUrl(payload?.terminal_url || "");

      // Cargar datos iniciales del pipeline
      await refreshPipeline();
    } catch (error) {
      setRemoteError(error?.message || "Unable to start remote runtime.");
    } finally {
      setRemoteLoading(false);
    }
  }, [labId, refreshPipeline]);

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
      await refreshPipeline();
    } finally {
      setAttackLoading(false);
    }
  }, [labId, refreshPipeline]);

  // ── Arranque inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    setRemoteUrl("");
    setRemoteError("");
    setLogs([]);
    setRuntime(DEFAULT_RUNTIME);

    if (autoStart && labId) startRuntime();
  }, [labId, autoStart, startRuntime]);

  // ── Polling: métricas y logs del pipeline real ───────────────────────────
  useEffect(() => {
    if (!labId) return;
    const timer = window.setInterval(refreshPipeline, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [labId, pollIntervalMs, refreshPipeline]);

  // ── Polling: URL de la VM (más lento, solo para detectar reinicios) ──────
  useEffect(() => {
    if (!labId) return;
    const timer = window.setInterval(refreshStatus, 15_000);
    return () => window.clearInterval(timer);
  }, [labId, refreshStatus]);

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

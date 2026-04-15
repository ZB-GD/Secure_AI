import { useCallback, useEffect, useState } from "react";
import { labService } from "../services/labService";

const DEFAULT_RUNTIME = {
  statusLabel: "idle",
  driftScore: 12,
  accuracy: 98.5,
  isCompromised: false,
  lastEvent: "Runtime not started.",
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildRuntimeSnapshot(payload) {
  const metrics = payload?.metrics || {};

  return {
    statusLabel:
      payload?.status ||
      payload?.lab_status ||
      metrics?.status ||
      "unknown",

    driftScore: toNumber(
      metrics?.drift_score ??
        payload?.drift_score ??
        metrics?.drift ??
        payload?.drift,
      12,
    ),

    accuracy: toNumber(
      metrics?.accuracy ??
        payload?.accuracy ??
        metrics?.prediction_accuracy ??
        payload?.prediction_accuracy,
      98.5,
    ),

    isCompromised: Boolean(
      metrics?.compromised ??
        payload?.compromised ??
        payload?.attack_active ??
        false,
    ),

    lastEvent:
      payload?.last_event ||
      metrics?.last_event ||
      payload?.message ||
      "No events yet.",
  };
}

export function useLabRuntime(labId, options = {}) {
  const {
    autoStart = true,
    pollIntervalMs = 3000,
    logPollIntervalMs = 1200,
    logLimit = 200,
  } = options;

  const [remoteUrl, setRemoteUrl] = useState("");
  const [remoteLoading, setRemoteLoading] = useState(Boolean(autoStart));
  const [remoteError, setRemoteError] = useState("");
  const [attackLoading, setAttackLoading] = useState(false);
  const [runtime, setRuntime] = useState(DEFAULT_RUNTIME);
  const [logs, setLogs] = useState([]);

  const refreshStatus = useCallback(async () => {
    if (!labId) return null;

    try {
      const payload = await labService.getStatusById(labId);

      if (payload?.terminal_url) {
        setRemoteUrl(payload.terminal_url);
      }

      setRuntime((prev) => ({
        ...prev,
        ...buildRuntimeSnapshot(payload),
      }));

      return payload;
    } catch {
      return null;
    }
  }, [labId]);

  const refreshLogs = useCallback(async () => {
    if (!labId) return null;

    try {
      const payload = await labService.getLogsById(labId, logLimit);
      setLogs(Array.isArray(payload?.lines) ? payload.lines : []);
      return payload;
    } catch {
      return null;
    }
  }, [labId, logLimit]);

  const startRuntime = useCallback(async () => {
    if (!labId) return;

    setRemoteLoading(true);
    setRemoteError("");

    try {
      const payload = await labService.startLabById(labId);

      setRemoteUrl(payload?.terminal_url || "");
      setRuntime((prev) => ({
        ...prev,
        ...buildRuntimeSnapshot(payload),
      }));

      await refreshStatus();
      await refreshLogs();
    } catch (error) {
      setRemoteError(error?.message || "Unable to start remote runtime.");
    } finally {
      setRemoteLoading(false);
    }
  }, [labId, refreshStatus, refreshLogs]);

  const retryRuntime = useCallback(async () => {
    setRemoteUrl("");
    setRemoteError("");
    setLogs([]);
    await startRuntime();
  }, [startRuntime]);

  const triggerAttack = useCallback(async () => {
    if (!labId) return null;

    setAttackLoading(true);

    try {
      const payload = await labService.triggerAttackById(labId);

      setRuntime((prev) => ({
        ...prev,
        ...buildRuntimeSnapshot(payload),
      }));

      await refreshStatus();
      await refreshLogs();

      return payload;
    } catch (error) {
      throw error;
    } finally {
      setAttackLoading(false);
    }
  }, [labId, refreshLogs, refreshStatus]);

  useEffect(() => {
    setRemoteUrl("");
    setRemoteError("");
    setLogs([]);
    setRuntime(DEFAULT_RUNTIME);

    if (autoStart && labId) {
      startRuntime();
    }
  }, [labId, autoStart, startRuntime]);

  useEffect(() => {
    if (!labId) return;

    const timer = window.setInterval(() => {
      refreshStatus();
    }, pollIntervalMs);

    return () => window.clearInterval(timer);
  }, [labId, pollIntervalMs, refreshStatus]);

  useEffect(() => {
    if (!labId) return;

    const timer = window.setInterval(() => {
      refreshLogs();
    }, logPollIntervalMs);

    return () => window.clearInterval(timer);
  }, [labId, logPollIntervalMs, refreshLogs]);

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
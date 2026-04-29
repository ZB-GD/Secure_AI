import { getApiBaseUrl, request } from "./apiClient";

const LAB_STAGE_BY_ID = {
  "lab-1": "sensor-data",
  "lab-2": "edge-preprocessing",
  "lab-3": "traffic-inference",
  "lab-4": "decision-retraining",
};

// Qué escenario del pipeline corresponde a cada lab
const LAB_SCENARIO_BY_ID = {
  "lab-1": 1,
  "lab-2": 2,
  "lab-3": 3,
  "lab-4": 4,
};

function getStageForLabId(labId) {
  return LAB_STAGE_BY_ID[labId] || "";
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return "";
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function normalizePayload(payload, baseUrl) {
  if (!payload || typeof payload !== "object") return payload;

  const terminalUrl =
    payload.terminal_url ||
    payload.remote_url ||
    payload.url ||
    payload?.runtime?.terminal_url ||
    "";

  return {
    ...payload,
    terminal_url: toAbsoluteUrl(terminalUrl, baseUrl),
  };
}

// ── Convierte la respuesta del pipeline real en el formato que espera useLabRuntime ──
function pipelineToRuntimeSnapshot(pipelineResult) {
  const metrics = pipelineResult?.metrics || {};
  const data    = pipelineResult?.data    || {};
  const n1      = data.n1 || {};
  const n2      = data.n2 || {};
  const n3      = data.n3 || {};
  const n4      = data.n4 || {};

  // Drift score real del pipeline (0-1 → lo mostramos como %)
  const driftRaw   = parseFloat(metrics.drift_score ?? 0);
  const driftScore = Math.round(driftRaw * 100);

  // Accuracy: si hay avg_congestion_score lo usamos como proxy de salud
  // Si hay poisoned readings → accuracy baja
  const poisoned   = metrics.poisoned_readings ?? 0;
  const accuracy   = poisoned > 0 ? 34.2 : 98.5;

  const isCompromised = poisoned > 0 || metrics.anomalous_features > 0;

  // Logs: concatenamos los logs de todos los nodos en orden
  const allLogs = [
    ...(n1.log || []).map(l => `[NODE-1] ${l}`),
    ...(n2.log || []).map(l => `[NODE-2] ${l}`),
    ...((n3.predictions || n3.log || []).length > 0
      ? (n3.log || [`[NODE-3] dominant_state=${metrics.dominant_state ?? "?"} integrity_ok=${metrics.integrity_ok ?? "?"}`])
          .map(l => `[NODE-3] ${l}`)
      : [`[NODE-3] dominant_state=${metrics.dominant_state ?? "?"}`]),
    n4.retrain_triggered
      ? `[NODE-4] Retraining triggered — drift=${driftRaw.toFixed(3)}`
      : `[NODE-4] No retraining — drift=${driftRaw.toFixed(3)} below threshold`,
    `[SUMMARY] ${metrics.summary ?? ""}`,
  ];

  const lastEvent = isCompromised
    ? `Poisoned payload detected. drift=${driftScore}% accuracy=${accuracy}%`
    : `Pipeline running normally. drift=${driftScore}%`;

  return {
    snapshot: {
      statusLabel:    isCompromised ? "compromised" : "running",
      driftScore,
      accuracy,
      isCompromised,
      lastEvent,
    },
    logs: allLogs,
  };
}

export const labService = {
  getStageForLabId,

  getRemoteUrl(_item, payloadOrUrl) {
    if (!payloadOrUrl) return "";
    if (typeof payloadOrUrl === "string") return payloadOrUrl;
    return payloadOrUrl?.terminal_url || "";
  },

  async startLabById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    const [baseUrl, payload] = await Promise.all([
      getApiBaseUrl(),
      request(`/labs/${stage}/start`, { method: "POST" }),
    ]);

    return normalizePayload(payload, baseUrl);
  },

  async stopLabById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    const [baseUrl, payload] = await Promise.all([
      getApiBaseUrl(),
      request(`/labs/${stage}/stop`, { method: "POST" }),
    ]);

    return normalizePayload(payload, baseUrl);
  },

  async getStatusById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    const [baseUrl, payload] = await Promise.all([
      getApiBaseUrl(),
      request(`/labs/${stage}/status`, { cache: "no-store" }),
    ]);

    return normalizePayload(payload, baseUrl);
  },

  // ── NUEVO: obtiene métricas y logs del pipeline real ──────────────────────
  async getPipelineData(labId) {
    const scenarioId = LAB_SCENARIO_BY_ID[labId];
    if (!scenarioId) return null;

    try {
      const result = await request(`/api/scenarios/${scenarioId}/run`, {
        cache: "no-store",
      });
      return pipelineToRuntimeSnapshot(result);
    } catch {
      return null;
    }
  },

  // ── Attack ya no hace POST al backend — el ataque se ejecuta desde la VM ──
  // Mantenemos el método para no romper el hook, pero ahora solo refresca datos
  async triggerAttackById(labId) {
    const data = await labService.getPipelineData(labId);
    return data ?? { snapshot: {}, logs: [] };
  },

  async getLogsById(labId, limit = 200) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    // Intentamos primero los logs del pipeline real
    try {
      const pipelineData = await labService.getPipelineData(labId);
      if (pipelineData?.logs?.length > 0) {
        return { lines: pipelineData.logs.slice(-limit) };
      }
    } catch { /* fallback */ }

    // Fallback: logs del contenedor Docker
    return request(`/logs/${stage}?limit=${limit}`, { cache: "no-store" });
  },
};

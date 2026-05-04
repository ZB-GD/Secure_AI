import { getApiBaseUrl, getSessionId, request } from "./apiClient";

const LAB_STAGE_BY_ID = {
  "lab-1": "sensor-data",
  "lab-2": "edge-preprocessing",
  "lab-3": "traffic-inference",
  "lab-4": "decision-retraining",
};

function getStageForLabId(labId) {
  return LAB_STAGE_BY_ID[labId] || "";
}

function sessionParam() {
  return `session=${getSessionId()}`;
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
      request(`/labs/${stage}/start?${sessionParam()}`, { method: "POST" }),
    ]);

    return normalizePayload(payload, baseUrl);
  },

  async stopLabById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    const [baseUrl, payload] = await Promise.all([
      getApiBaseUrl(),
      request(`/labs/${stage}/stop?${sessionParam()}`, { method: "POST" }),
    ]);

    return normalizePayload(payload, baseUrl);
  },

  async getStatusById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    const [baseUrl, payload] = await Promise.all([
      getApiBaseUrl(),
      request(`/labs/${stage}/status?${sessionParam()}`, { cache: "no-store" }),
    ]);

    return normalizePayload(payload, baseUrl);
  },

  async triggerAttackById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    return request(`/labs/${stage}/attack?${sessionParam()}`, {
      method: "POST",
      cache: "no-store",
    });
  },

  async getLogsById(labId, limit = 200) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    return request(`/logs/labs/${stage}?limit=${limit}&${sessionParam()}`, {
      cache: "no-store",
    });
  },
};

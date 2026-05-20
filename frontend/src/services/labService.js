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
  return `session_id=${getSessionId()}`;
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return "";
  try {
    const parsed = new URL(url, baseUrl);
    const pageHost = window.location.hostname;
    const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

    if (pageHost && !localHosts.has(pageHost) && localHosts.has(parsed.hostname)) {
      parsed.hostname = pageHost;
    }

    return parsed.toString();
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

  async stopLabById(labId, options = {}) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    const [baseUrl, payload] = await Promise.all([
      getApiBaseUrl(),
      request(`/labs/${stage}/stop?${sessionParam()}`, {
        method: "POST",
        ...options,
      }),
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

  async heartbeatLabById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    return request(`/labs/${stage}/heartbeat?${sessionParam()}`, {
      method: "POST",
      cache: "no-store",
    });
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

  async injectCommandById(labId, text) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No stage configured for ${labId}`);

    return request(`/labs/${stage}/inject-command?${sessionParam()}`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
};

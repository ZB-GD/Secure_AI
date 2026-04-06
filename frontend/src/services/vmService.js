const API_BASE_URL_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  "http://192.168.56.102:8000",
  "http://localhost:8000",
].filter(Boolean);

let resolvedApiBaseUrlPromise = null;

const LAB_PHASE_BY_ID = {
  "lab-1": "phase-1",
  "lab-2": "phase-2",
  "lab-3": "phase-3",
  "lab-4": "phase-4",
};

function getPhaseForLabId(labId) {
  return LAB_PHASE_BY_ID[labId] || "";
}

async function resolveApiBaseUrl() {
  if (API_BASE_URL_CANDIDATES.length === 0) {
    return "http://localhost:8000";
  }

  if (API_BASE_URL_CANDIDATES.length === 1) {
    return API_BASE_URL_CANDIDATES[0];
  }

  const timeoutMs = 800;

  for (const baseUrl of API_BASE_URL_CANDIDATES) {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      window.clearTimeout(timeoutId);

      if (response.ok) {
        return baseUrl;
      }
    } catch {
      // Probar la siguiente URL candidata.
    }
  }

  return API_BASE_URL_CANDIDATES[0];
}

async function getApiBaseUrl() {
  if (!resolvedApiBaseUrlPromise) {
    resolvedApiBaseUrlPromise = resolveApiBaseUrl();
  }

  return resolvedApiBaseUrlPromise;
}

async function request(path, options = {}) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.detail) message = payload.detail;
    } catch {
      // Keep fallback status-based message.
    }
    throw new Error(message);
  }

  return response.json();
}

export const vmService = {
  getRemoteUrl(lab, runtimeRemoteUrl) {
    return runtimeRemoteUrl || "";
  },

  getPhaseForLabId,

  async startLabById(labId) {
    const phase = getPhaseForLabId(labId);
    if (!phase) throw new Error(`No hay fase configurada para ${labId}`);
    return request(`/labs/${phase}/start`, { method: "POST" });
  },

  async stopLabById(labId) {
    const phase = getPhaseForLabId(labId);
    if (!phase) throw new Error(`No hay fase configurada para ${labId}`);
    return request(`/labs/${phase}/stop`, { method: "POST" });
  },

  async getStatusById(labId) {
    const phase = getPhaseForLabId(labId);
    if (!phase) throw new Error(`No hay fase configurada para ${labId}`);
    return request(`/labs/${phase}/status`);
  },
};

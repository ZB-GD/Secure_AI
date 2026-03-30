const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const LAB_PHASE_BY_ID = {
  "lab-1": "phase-1",
  "lab-2": "phase-2",
  "lab-3": "phase-3",
  "lab-4": "phase-4",
};

function getPhaseForLabId(labId) {
  return LAB_PHASE_BY_ID[labId] || "";
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
    return runtimeRemoteUrl || lab?.remote?.url || "";
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

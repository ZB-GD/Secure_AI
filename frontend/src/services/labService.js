import { request } from "./apiClient";

const LAB_STAGE_BY_ID = {
  "lab-1": "sensor-data",
  "lab-2": "edge-preprocessing",
  "lab-3": "traffic-inference",
  "lab-4": "decision-retraining",
};

function getStageForLabId(labId) {
  return LAB_STAGE_BY_ID[labId] || "";
}

export const labService = {
  getRemoteUrl(_lab, runtimeRemoteUrl) {
    return runtimeRemoteUrl || "";
  },

  getStageForLabId,

  async startLabById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No hay fase configurada para ${labId}`);
    return request(`/labs/${stage}/start`, { method: "POST" });
  },

  async stopLabById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No hay fase configurada para ${labId}`);
    return request(`/labs/${stage}/stop`, { method: "POST" });
  },

  async getStatusById(labId) {
    const stage = getStageForLabId(labId);
    if (!stage) throw new Error(`No hay fase configurada para ${labId}`);
    return request(`/labs/${stage}/status`);
  },
};

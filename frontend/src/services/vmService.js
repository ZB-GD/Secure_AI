export const vmService = {
  getRemoteUrl(lab) {
    return lab?.remote?.url || ""
  },
}
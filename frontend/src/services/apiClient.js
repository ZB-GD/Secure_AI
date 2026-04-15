const API_BASE_URL_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  "http://192.168.56.102:8000",
  "http://localhost:8000",
].filter(Boolean);

let resolvedApiBaseUrlPromise = null;

async function resolveApiBaseUrl() {
  if (API_BASE_URL_CANDIDATES.length === 0) {
    return "http://localhost:8000";
  }

  if (API_BASE_URL_CANDIDATES.length === 1) {
    return API_BASE_URL_CANDIDATES[0];
  }

  const timeoutMs = 800;

  for (const baseUrl of API_BASE_URL_CANDIDATES) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.ok) return baseUrl;
    } catch {
      // probar siguiente candidato
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return API_BASE_URL_CANDIDATES[0];
}

export async function getApiBaseUrl() {
  if (!resolvedApiBaseUrlPromise) {
    resolvedApiBaseUrlPromise = resolveApiBaseUrl();
  }
  return resolvedApiBaseUrlPromise;
}

export async function request(path, options = {}) {
  const baseUrl = await getApiBaseUrl();
  const { headers, ...restOptions } = options;

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    ...restOptions,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.detail) message = payload.detail;
      else if (payload?.message) message = payload.message;
    } catch {
      // fallback
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}
// Empty string means "same origin" — nginx serves both frontend and API
// from the same host, so relative URLs are correct in production.
// undefined/null means the var was not set — exclude from candidates.
const API_BASE_URL_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_API_BASE_URL_FALLBACK,
  "http://localhost:8000",
].filter((u) => u !== undefined && u !== null);

const _API_KEY = import.meta.env.VITE_API_KEY || "";

// ── Session identity ──────────────────────────────────────────────────────────
const SESSION_STORAGE_KEY = "seclabs-session-id";

export function getSessionId() {
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

// ── Base URL resolution ───────────────────────────────────────────────────────
let resolvedApiBaseUrlPromise = null;

async function resolveApiBaseUrl() {
  if (API_BASE_URL_CANDIDATES.length === 0) return "http://localhost:8000";
  if (API_BASE_URL_CANDIDATES.length === 1) return API_BASE_URL_CANDIDATES[0];

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
      // try next candidate
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

// ── HTTP client ───────────────────────────────────────────────────────────────
export async function request(path, options = {}) {
  const baseUrl = await getApiBaseUrl();
  const { headers, ...restOptions } = options;

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(_API_KEY ? { "X-API-Key": _API_KEY } : {}),
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
      // use status fallback
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

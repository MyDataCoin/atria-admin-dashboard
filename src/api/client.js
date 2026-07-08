// Central HTTP client for the Atria backend.
//
// - Base URL comes from VITE_API_BASE_URL (falls back to the public server).
// - Access/refresh tokens are persisted in localStorage.
// - Requests attach the Bearer token automatically; on a 401 we transparently try
//   ONE refresh (POST /auth/refresh) and replay the original request.
// - Errors are surfaced as ApiError carrying the parsed RFC-7807 ProblemDetails.

// In dev we go through the Vite proxy (same-origin '' -> /api/... -> backend), which
// avoids the backend's missing CORS headers. In a production build we call the backend
// directly (requires backend CORS or same-domain hosting) via VITE_API_BASE_URL.
const BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://atria-api.eaysdev.online').replace(/\/+$/, '');

const API_PREFIX = '/api/v1';

const ACCESS_KEY = 'atria_access_token';
const REFRESH_KEY = 'atria_refresh_token';

// ---- Token storage --------------------------------------------------------

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  get isAuthenticated() {
    return !!localStorage.getItem(ACCESS_KEY);
  },
};

// ---- Errors ---------------------------------------------------------------

export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.title || problem?.detail || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem || null;
    this.correlationId = problem?.correlationId;
  }
}

// ---- JWT helper (decode payload, no verification) -------------------------

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

// ---- Core request ---------------------------------------------------------

let refreshInFlight = null;

async function doRefresh() {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) throw new ApiError(401, { title: 'No refresh token' });

  const res = await fetch(`${BASE_URL}${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    tokenStore.clear();
    throw new ApiError(res.status, await safeProblem(res));
  }

  const tokens = await res.json();
  tokenStore.set(tokens);
  return tokens.accessToken;
}

async function safeProblem(res) {
  try {
    return await res.json();
  } catch {
    return { title: res.statusText, status: res.status };
  }
}

/**
 * Low-level request. Prefer the typed helpers in endpoints.js.
 *
 * @param {string} path      Path under /api/v1 (e.g. "/properties").
 * @param {object} [opts]
 * @param {string} [opts.method="GET"]
 * @param {object|FormData} [opts.body]  JSON-serialized unless it is FormData.
 * @param {object} [opts.query]          Query params (undefined values skipped).
 * @param {boolean} [opts.auth=true]     Attach the Bearer token.
 * @param {boolean} [opts.raw=false]     Resolve with the Response (for file downloads).
 */
export async function request(path, opts = {}) {
  const { method = 'GET', body, query, auth = true, raw = false, _retried } = opts;

  let url = `${BASE_URL}${API_PREFIX}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers = {};
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  // Transparent single refresh + replay on 401.
  if (res.status === 401 && auth && !_retried && tokenStore.refresh) {
    try {
      refreshInFlight = refreshInFlight || doRefresh();
      await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
    return request(path, { ...opts, _retried: true });
  }

  if (!res.ok) throw new ApiError(res.status, await safeProblem(res));

  if (raw) return res;
  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export { BASE_URL };

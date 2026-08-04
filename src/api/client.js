// Central HTTP client for the Atria backend.
//
// - Base URL comes from VITE_API_BASE_URL (falls back to the public server).
// - The ACCESS token lives in memory only. The REFRESH token is never seen by this code at
//   all: the API sets it as an HttpOnly cookie, so a script on this origin cannot read it.
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

// ---- Token storage --------------------------------------------------------
//
// Both tokens used to sit in localStorage. That put a thirty-day refresh token — a full SuperAdmin
// session — within reach of any script running on this origin: one XSS, or one compromised package
// in the bundle, and the attacker holds a credential that outlives any password change they can be
// locked out by. Rotation and reuse detection on the server do not help, because the attacker has a
// valid token and can rotate it themselves.
//
// So: the access token lives in a module-scoped variable and dies with the tab, and the refresh
// token never reaches JavaScript — the API sets it as HttpOnly;Secure;SameSite=None on /auth, and
// the browser attaches it to /auth/refresh on its own. `credentials: 'include'` below is what lets
// it. On reload there is no access token, so the first call 401s and the transparent refresh
// restores the session from the cookie.

let accessToken = null;

export const tokenStore = {
  get access() {
    return accessToken;
  },
  set({ accessToken: token }) {
    if (token) accessToken = token;
  },
  clear() {
    accessToken = null;
  },
  get isAuthenticated() {
    return !!accessToken;
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
  // No body: the refresh token is in the HttpOnly cookie, which `credentials: 'include'` sends.
  const res = await fetch(`${BASE_URL}${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: '{}',
  });

  if (!res.ok) {
    tokenStore.clear();
    throw new ApiError(res.status, await safeProblem(res));
  }

  const tokens = await res.json();
  tokenStore.set(tokens);
  return tokens.accessToken;
}

/**
 * Coalesces concurrent refreshes into one.
 *
 * The previous version cleared the in-flight promise in a `finally` that ran for EVERY awaiting
 * caller, not just the one that started it. Two requests 401-ing at once therefore raced: the second
 * could find the slot already cleared and start a second refresh with a token the first had just
 * rotated away. The server treats a replayed token as a leak and revokes the whole session, so a
 * page that fired several requests at once could log the user out and file a false compromise
 * signal on the way. Only the initiator clears the slot here.
 */
function refreshOnce() {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
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
    // Send the refresh cookie. It is scoped to /api/v1/auth, so it rides along only where it is
    // actually needed and is not attached to ordinary API calls.
    credentials: 'include',
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  // Transparent single refresh + replay on 401. There is no local refresh token to check for any
  // more — whether one exists is the cookie's business, and a refresh that has nothing to work with
  // simply comes back 401.
  if (res.status === 401 && auth && !_retried) {
    try {
      await refreshOnce();
    } catch {
      // The session is genuinely over; surface the original 401 rather than the refresh failure.
      throw new ApiError(401, await safeProblem(res));
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

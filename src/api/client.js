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
  : (import.meta.env.VITE_API_BASE_URL || 'https://api.atria.kg').replace(/\/+$/, '');

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
// UTC ms at which the access token stops being accepted. 0 = no session.
let accessExpiresAt = 0;
// Timer that refreshes shortly BEFORE the token dies, so ordinary calls stop discovering it by 401.
let proactiveTimer = null;

// The access token lives ~15 minutes (Jwt:AccessTokenMinutes). Renewing this far ahead of the
// deadline keeps a request that is already in flight from arriving with a token that expired on the
// way, and covers a clock that is a little off between browser and server.
const EXPIRY_SKEW_MS = 60_000;

// Told about a session that is definitively over (the server refused the refresh), as opposed to one
// that merely could not be renewed right now because the network is down. The panel listens and
// returns to the login form; without it a dead session leaves a UI that looks signed in and 401s on
// every click.
const sessionEndedHandlers = new Set();

/** Subscribe to "the session is over, show the login form". Returns an unsubscribe function. */
export function onSessionEnded(handler) {
  sessionEndedHandlers.add(handler);
  return () => sessionEndedHandlers.delete(handler);
}

function notifySessionEnded() {
  sessionEndedHandlers.forEach((h) => {
    try {
      h();
    } catch {
      /* one broken listener must not stop the others */
    }
  });
}

// One rotation per browser, not per tab. The refresh token rotates on every use, so two tabs waking
// up together used to present the same token twice; the server has a grace window for exactly that
// race now, but sharing the result is still both faster and quieter. A tab that receives a token
// here adopts it instead of asking for one of its own.
const authChannel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('atria-admin-auth');

if (authChannel) {
  authChannel.onmessage = (event) => {
    const msg = event.data;
    if (!msg) return;
    if (msg.type === 'tokens' && msg.accessToken && msg.expiresAt > accessExpiresAt) {
      applyTokens(msg.accessToken, msg.expiresAt);
    } else if (msg.type === 'ended') {
      clearTokens();
      notifySessionEnded();
    }
  };
}

/** Parses the API's expiry (UTC, sometimes without the trailing Z) into epoch ms. */
function parseExpiry(expiresAtUtc) {
  if (!expiresAtUtc) return 0;
  const iso = /([Zz]|[+-]\d{2}:?\d{2})$/.test(expiresAtUtc) ? expiresAtUtc : `${expiresAtUtc}Z`;
  const at = Date.parse(iso);
  return Number.isNaN(at) ? 0 : at;
}

function applyTokens(token, expiresAt) {
  accessToken = token;
  accessExpiresAt = expiresAt;
  scheduleProactiveRefresh();
}

function clearTokens() {
  accessToken = null;
  accessExpiresAt = 0;
  if (proactiveTimer) clearTimeout(proactiveTimer);
  proactiveTimer = null;
}

/**
 * Renews the token a minute before it expires rather than waiting for a 401.
 *
 * Reacting to 401s works, but it means every fifteen minutes the first few calls fail, retry, and
 * arrive late — and any call that cannot be replayed safely (a file upload, a POST the user is
 * watching) pays for it. A tab left open overnight is the same story a hundred times over.
 */
function scheduleProactiveRefresh() {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  proactiveTimer = null;
  if (!accessToken || !accessExpiresAt) return;

  // Never sooner than a few seconds: a server clock ahead of ours would otherwise spin this loop.
  const delay = Math.max(accessExpiresAt - Date.now() - EXPIRY_SKEW_MS, 5_000);
  proactiveTimer = setTimeout(() => {
    refreshOnce().catch(() => {
      /* a failure here is reported through the request path or onSessionEnded */
    });
  }, delay);
}

export const tokenStore = {
  get access() {
    return accessToken;
  },
  set({ accessToken: token, expiresAtUtc }) {
    if (!token) return;
    applyTokens(token, parseExpiry(expiresAtUtc) || Date.now() + 10 * 60_000);
    authChannel?.postMessage({ type: 'tokens', accessToken, expiresAt: accessExpiresAt });
  },
  clear({ broadcast = true } = {}) {
    clearTokens();
    if (broadcast) authChannel?.postMessage({ type: 'ended' });
  },
  get isAuthenticated() {
    return !!accessToken;
  },
  /** Is the token gone, or close enough to expiry that it should be renewed before the next call? */
  get needsRefresh() {
    return !accessToken || Date.now() + EXPIRY_SKEW_MS >= accessExpiresAt;
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

/**
 * The session is over: the server refused the refresh token itself.
 *
 * Kept apart from every other reason a refresh can fail, because only this one justifies throwing
 * someone back to the login form. A refresh that failed because the Wi-Fi dropped or the API
 * restarted says nothing about the session, and treating the two alike is what made a moment of bad
 * network cost a full re-login.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super('Сессия истекла — войдите снова.');
    this.name = 'SessionExpiredError';
  }
}

/** A refresh that could not be completed right now. The session is untouched; the caller may retry. */
export class RefreshUnavailableError extends Error {
  constructor(cause) {
    super('Не удалось обновить сессию — проблема со связью.');
    this.name = 'RefreshUnavailableError';
    this.cause = cause;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Transient failures are retried a couple of times before the caller hears about them: a refresh
// lands during a deploy or a tunnel hiccup often enough that one immediate attempt is not a fair
// test of whether the session is alive.
const REFRESH_RETRY_DELAYS_MS = [400, 1200];

async function doRefresh() {
  let lastError = null;

  for (let attempt = 0; attempt <= REFRESH_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) await sleep(REFRESH_RETRY_DELAYS_MS[attempt - 1]);

    let res;
    try {
      // No body: the refresh token is in the HttpOnly cookie, which `credentials: 'include'` sends.
      res = await fetch(`${BASE_URL}${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      });
    } catch (networkErr) {
      lastError = networkErr;
      continue;
    }

    // The server looked at the cookie and said no. That is the session, not the connection.
    if (res.status === 401 || res.status === 403) {
      tokenStore.clear();
      notifySessionEnded();
      throw new SessionExpiredError();
    }

    if (!res.ok) {
      // 5xx, a gateway page, anything else: the session may well be fine. Keep it and try again.
      lastError = new ApiError(res.status, await safeProblem(res));
      continue;
    }

    const tokens = await res.json();
    tokenStore.set(tokens);
    return tokens.accessToken;
  }

  throw new RefreshUnavailableError(lastError);
}

/**
 * Coalesces concurrent refreshes into one.
 *
 * The previous version cleared the in-flight promise in a `finally` that ran for EVERY awaiting
 * caller, not just the one that started it. Two requests 401-ing at once therefore raced: the second
 * could find the slot already cleared and start a second refresh with a token the first had just
 * rotated away. Only the initiator clears the slot here.
 */
export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

// Internal alias kept for the call sites below that read better as "refresh once".
const refreshOnce = refreshSession;

// Coming back to a tab that sat in the background is the other moment a session looks broken: timers
// in inactive tabs are throttled, so the proactive refresh above may have fired late or not at all.
// Renewing on the way back in means the first click after lunch works like any other.
if (typeof document !== 'undefined') {
  const renewIfStale = () => {
    if (tokenStore.isAuthenticated && tokenStore.needsRefresh) {
      refreshOnce().catch(() => {});
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renewIfStale();
  });
  window.addEventListener('online', renewIfStale);
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

  // Renew BEFORE sending when the token is at (or past) its expiry, so the call goes out with a
  // token the server will still accept instead of discovering the problem as a 401 and replaying.
  if (auth && !_retried && tokenStore.isAuthenticated && tokenStore.needsRefresh) {
    try {
      await refreshOnce();
    } catch (err) {
      // A dead session is worth failing fast on; a network blip is not — let the request go and be
      // judged on its own answer.
      if (err instanceof SessionExpiredError) throw new ApiError(401, { title: err.message });
    }
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
      // Either the session is over (listeners have already been told) or the refresh could not be
      // made right now. Both surface as the original 401 — but only the first one cleared the token,
      // so a network blip leaves the session in place and the next attempt can still succeed.
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

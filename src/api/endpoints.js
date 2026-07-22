// Typed wrappers around the Atria API (see swagger). One function per operation,
// grouped by tag. All return parsed JSON (or null for 204). Errors throw ApiError.

import { request, tokenStore } from './client';

// ---- Auth (phone-only, Kyrgyzstan +996) -----------------------------------

export const auth = {
  // Admin/staff login (username + password) -> access + refresh, both persisted so the
  // client can auto-refresh the access token on 401.
  adminLogin: async (username, password) => {
    const tokens = await request('/auth/admin/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    });
    tokenStore.set(tokens);
    return tokens;
  },

  // Realtor login (username + password) -> access + refresh, both persisted. Same
  // shape as adminLogin but a different endpoint; the role is carried in the JWT.
  realtorLogin: async (username, password) => {
    const tokens = await request('/auth/realtor/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    });
    tokenStore.set(tokens);
    return tokens;
  },

  // Step 1: request an SMS OTP for the given phone (+996XXXXXXXXX). Returns 204.
  requestOtp: (phone) =>
    request('/auth/register/phone/request-otp', { method: 'POST', body: { phone }, auth: false }),

  // Step 2: verify the OTP; creates the account on first use. Returns AuthTokensDto.
  // Also persists the tokens so subsequent calls are authenticated.
  verifyOtp: async (phone, code) => {
    const tokens = await request('/auth/register/phone/verify-otp', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    });
    tokenStore.set(tokens);
    return tokens;
  },

  // Rotate refresh -> new access+refresh pair (also persisted).
  refresh: async (refreshToken = tokenStore.refresh) => {
    const tokens = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    tokenStore.set(tokens);
    return tokens;
  },

  logout: () => tokenStore.clear(),
};

// ---- Properties -----------------------------------------------------------

export const properties = {
  // Authenticated: GET /properties is scoped by role on the backend — drafts are admin-only and
  // hidden from anonymous (public-site) callers. The admin panel sends its token so it also sees
  // drafts; the public site calls the same route anonymously and gets coming_soon/open/completed.
  list: () => request('/properties', { auth: true }),
  get: (id) => request(`/properties/${id}`, { auth: true }),
  // Admin only. body: { name, description?, address?, totalValue, tokenPrice, totalTokens, currency }
  create: (body) => request('/properties', { method: 'POST', body }),
  // Admin only. Announces a draft as "coming soon": draft -> coming_soon, so the public
  // site lists it under "Скоро" while drafts stay admin-only/hidden.
  // PROPOSED — backend must add POST /properties/{id}/announce (see handoff notes).
  announce: (id) => request(`/properties/${id}/announce`, { method: 'POST' }),
  // Admin only. Reverse of announce: coming_soon -> draft, hiding it from the public site again.
  // PROPOSED — backend must add POST /properties/{id}/unannounce (see handoff notes).
  unannounce: (id) => request(`/properties/${id}/unannounce`, { method: 'POST' }),
  // Admin only. Publishes the offering: coming_soon (or draft) -> open, so the public site
  // moves the object to "open for purchase" (открыт к покупке).
  publish: (id) => request(`/properties/${id}/publish`, { method: 'POST' }),
  // Admin only. Closes an open offering: open -> completed, so the public site shows it
  // as "sold out" (распродан). 409 if the property isn't currently open.
  complete: (id) => request(`/properties/${id}/complete`, { method: 'POST' }),
  // Admin only. Temporarily halts purchases on an open offering (sets salesPaused=true).
  // The public site must block "buy" while paused. PROPOSED — backend must add
  // POST /properties/{id}/pause and expose the flag on PropertyDto (see handoff notes).
  pause: (id) => request(`/properties/${id}/pause`, { method: 'POST' }),
  // Admin only. Resumes a paused offering (salesPaused=false). PROPOSED — see handoff notes.
  resume: (id) => request(`/properties/${id}/resume`, { method: 'POST' }),
  // Admin only. Uploads one image (max 3/property). Returns { id, url }.
  uploadImage: (id, file, filename) => {
    const form = new FormData();
    form.append('file', file, filename || file.name || 'photo.jpg');
    return request(`/properties/${id}/images`, { method: 'POST', body: form });
  },
  deleteImage: (id, imageId) =>
    request(`/properties/${id}/images/${imageId}`, { method: 'DELETE' }),
  // Admin only. Uploads a document file (PDF/DOC/…) for a property. The backend stores only
  // the file (multipart field `file`) and returns { id, url, fileName, contentType }.
  uploadDocument: (id, file, filename) => {
    const form = new FormData();
    form.append('file', file, filename || file.name || 'document.pdf');
    return request(`/properties/${id}/documents`, { method: 'POST', body: form });
  },
  deleteDocument: (id, documentId) =>
    request(`/properties/${id}/documents/${documentId}`, { method: 'DELETE' }),
};

// ---- Investments ----------------------------------------------------------

export const investments = {
  create: (body) => request('/investments', { method: 'POST', body }), // { propertyId, amount }
  startPayment: (investmentId, provider) =>
    request(`/investments/${investmentId}/payments`, { method: 'POST', body: { provider } }),
  mine: () => request('/investments/me'),
  portfolio: () => request('/investments/portfolio'),
  get: (id) => request(`/investments/${id}`),
};

// ---- KYC ------------------------------------------------------------------

export const kyc = {
  submit: (body) => request('/kyc/submit', { method: 'POST', body }),
  linkWallet: (walletAddress) =>
    request('/kyc/wallet', { method: 'PATCH', body: { walletAddress } }),
  me: () => request('/kyc/me'),
  // Compliance only. body: { approve, reason? }
  review: (id, body) => request(`/kyc/${id}/review`, { method: 'POST', body }),
};

// ---- Consent --------------------------------------------------------------

export const consent = {
  // body: { type, version, accepted }
  record: (body) => request('/consent', { method: 'POST', body }),
};

// ---- Documents ------------------------------------------------------------

export const documents = {
  // file: File/Blob, type: DocumentType name (e.g. "Passport")
  upload: (file, type) => {
    const form = new FormData();
    form.append('File', file);
    form.append('Type', type);
    return request('/documents', { method: 'POST', body: form });
  },
  mine: () => request('/documents/me'),
  // Returns the raw Response so the caller can stream/download the bytes.
  download: (id) => request(`/documents/${id}`, { raw: true }),
};

// ---- Notifications --------------------------------------------------------

export const notifications = {
  mine: () => request('/notifications/me'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
};

// ---- Support tickets ------------------------------------------------------
// GET /support/tickets is role-scoped: an Investor sees only their own tickets,
// an Admin sees all. On the list route each ticket omits `messages` (null) and,
// for Admin, carries an `investor` { id, fullName }. Fetch a ticket by id to get
// the full message thread. Statuses are lowercase: open | pending | closed.

export const support = {
  // Admin: all tickets; Investor: own. messages is null here — fetch by id for the thread.
  listTickets: () => request('/support/tickets'),
  // Full ticket incl. message thread (owner or Admin).
  getTicket: (id) => request(`/support/tickets/${id}`),
  // Opens a new ticket for the current investor. body: { subject, category, body }
  createTicket: (body) => request('/support/tickets', { method: 'POST', body }),
  // Appends a message to a ticket (owner or Admin). The author (investor/support)
  // is derived from the caller's role server-side. body: { body }
  addMessage: (id, text) =>
    request(`/support/tickets/${id}/messages`, { method: 'POST', body: { body: text } }),
  // Closes a ticket (owner or Admin).
  close: (id) => request(`/support/tickets/${id}/close`, { method: 'POST' }),
  // Reopens a closed ticket (Admin only).
  reopen: (id) => request(`/support/tickets/${id}/reopen`, { method: 'POST' }),
};

// ---- Publications (investor news feed & financial reports) ----------------
// One entity, one route, scoped by role on the backend: Admin sees drafts too,
// investors/anonymous see only status=published. Ordered publishedAtUtc DESC.
// `propertyId` is nullable — a publication with none is a general platform news item.

export const publications = {
  // Filters are optional. `generalOnly: true` returns only object-less (general) items.
  // Returns a paged result: { items, page, pageSize, totalCount, totalPages }.
  list: ({ propertyId, generalOnly, type, page, pageSize } = {}) =>
    request('/publications', {
      query: { propertyId, generalOnly: generalOnly ? 'true' : undefined, type, page, pageSize },
    }),
  get: (id) => request(`/publications/${id}`),
  // Admin only. body: { type, title, body, propertyId? }. Creating one also fans out
  // notifications to investors server-side — the dashboard must not do that itself.
  create: (body) => request('/publications', { method: 'POST', body }),
  // Admin only. Partial edit: { title?, body?, type? }
  update: (id, body) => request(`/publications/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/publications/${id}`, { method: 'DELETE' }),
};

// ---- Admin audit ----------------------------------------------------------

// Admin/Compliance only. Entries are written server-side inside the commands they
// describe — the dashboard only reads them, never appends. Append-only and immutable.
// Returns a paged result: { items, page, pageSize, totalCount, totalPages }, newest first.
export const audit = {
  // All filters optional. severity: 'success' | 'warning' | 'alert'.
  query: ({ entityType, entityId, eventType, severity, page, pageSize } = {}) =>
    request('/audit', {
      query: { entityType, entityId, eventType, severity, page, pageSize },
    }),
};

// ---- Admin: investor/user registry ----------------------------------------
// GET /users (Admin/Compliance): lists all users with their optional KYC profile
// (id, phoneNumber, fullName [decrypted], walletAddress, status, createdAtUtc).
export const admin = {
  listInvestors: () => request('/users'),
  // Admin/Compliance. Investors holding shares in a property (investments ⋈ users/kyc).
  // NOTE: proposed endpoint — not in the API yet; wired with a demo fallback.
  propertyInvestments: (propertyId) => request(`/properties/${propertyId}/investments`),
  // Admin/Compliance. One investor's whole portfolio: every property they hold, with
  // token count, share % and invested amount. PROPOSED — backend must add
  // GET /users/{id}/investments (see BACKEND-INVESTOR-PORTFOLIO.md).
  investorPortfolio: (userId) => request(`/users/${userId}/investments`),
  // Admin/Compliance. Realtor leaderboard: each realtor with their completed/total deal
  // counts, for the dashboard ranking. PROPOSED — the existing /deals & /realtor routes
  // are Realtor-only (403 for admin). See BACKEND-REALTOR-STATS.md.
  realtorStats: () => request('/realtors/stats'),
};

// ---- Super admin ----------------------------------------------------------
// Ban/unban accounts and reset/restore passwords for admins & realtors.
// ALL PROPOSED — the backend has no superadmin role and none of these routes yet
// (superadmin login returns 401). See BACKEND-SUPERADMIN.md.
export const superadmin = {
  // List staff/admin accounts (so a super admin can reset/restore their passwords).
  // PROPOSED — no admin-list endpoint exists yet (/users is the investor registry and
  // carries no role). See BACKEND-SUPERADMIN-ADMINS.md.
  listAdmins: () => request('/admins'),
  // Register a new realtor account. PROPOSED — no such endpoint exists yet; only OTP
  // (investors) and login routes are present. See BACKEND-SUPERADMIN-REALTOR-REGISTER.md.
  // body: { username, password, fullName, companyName?, phoneNumber? }
  registerRealtor: (body) => request('/realtors', { method: 'POST', body }),
  // Block an account (investor or realtor). It can no longer authenticate. The optional
  // reason is stored with the ban and shown to the user on the blocked screen.
  // body: { reason } — PROPOSED (the endpoint takes no body yet). See BACKEND-SUPERADMIN-APPEALS.md.
  banUser: (userId, reason) =>
    request(`/users/${userId}/ban`, { method: 'POST', body: reason ? { reason } : undefined }),
  unbanUser: (userId) => request(`/users/${userId}/unban`, { method: 'POST' }),
  // Reset an admin/realtor password. The backend generates a temporary one and returns
  // it (or emails/SMS it) — body may be empty, or { newPassword } to set explicitly.
  resetPassword: (userId, body) =>
    request(`/users/${userId}/password/reset`, { method: 'POST', body }),
  // Restore a previously-reset account to a usable state (e.g. clear the forced-reset
  // flag). Kept separate so "reset" and "restore" are distinct audited actions.
  restorePassword: (userId) =>
    request(`/users/${userId}/password/restore`, { method: 'POST' }),
  // Ban appeals: a blocked user submits one from the "you are blocked" screen; the super
  // admin reads them here. PROPOSED — see BACKEND-SUPERADMIN-APPEALS.md.
  listAppeals: () => request('/appeals'),
};

// Appeal submitted by a blocked user. No auth: the account can't authenticate while
// banned, so this route must accept the ban context without a token.
// body: { username, message }  — PROPOSED, see BACKEND-SUPERADMIN-APPEALS.md.
export const appeals = {
  submit: (body) => request('/appeals', { method: 'POST', body, auth: false }),
};

export default {
  auth,
  properties,
  investments,
  kyc,
  consent,
  documents,
  notifications,
  publications,
  support,
  audit,
  admin,
  superadmin,
  appeals,
};

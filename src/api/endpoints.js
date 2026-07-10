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
  list: () => request('/properties', { auth: false }),
  get: (id) => request(`/properties/${id}`, { auth: false }),
  // Admin only. body: { name, description?, address?, totalValue, tokenPrice, totalTokens, currency }
  create: (body) => request('/properties', { method: 'POST', body }),
  // Admin only. Publishes the offering: draft -> open, so the public site moves the
  // object from "coming soon" (скоро) to "open for purchase" (открыт к покупке).
  publish: (id) => request(`/properties/${id}/publish`, { method: 'POST' }),
  // Admin only. Closes an open offering: open -> completed, so the public site shows it
  // as "sold out" (распродан). 409 if the property isn't currently open.
  complete: (id) => request(`/properties/${id}/complete`, { method: 'POST' }),
  // Admin only. Uploads one image (max 3/property). Returns { id, url }.
  uploadImage: (id, file, filename) => {
    const form = new FormData();
    form.append('file', file, filename || file.name || 'photo.jpg');
    return request(`/properties/${id}/images`, { method: 'POST', body: form });
  },
  deleteImage: (id, imageId) =>
    request(`/properties/${id}/images/${imageId}`, { method: 'DELETE' }),
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

// ---- Admin audit ----------------------------------------------------------

export const audit = {
  // Admin/Compliance only. Both filters optional.
  query: ({ entityType, entityId } = {}) =>
    request('/audit', { query: { entityType, entityId } }),
};

// ---- Admin: investor/user registry ----------------------------------------
// GET /users (Admin/Compliance): lists all users with their optional KYC profile
// (id, phoneNumber, fullName [decrypted], walletAddress, status, createdAtUtc).
export const admin = {
  listInvestors: () => request('/users'),
  // Admin/Compliance. Investors holding shares in a property (investments ⋈ users/kyc).
  // NOTE: proposed endpoint — not in the API yet; wired with a demo fallback.
  propertyInvestments: (propertyId) => request(`/properties/${propertyId}/investments`),
};

export default { auth, properties, investments, kyc, consent, documents, notifications, support, audit, admin };

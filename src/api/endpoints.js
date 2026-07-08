// Typed wrappers around the Atria API (see swagger). One function per operation,
// grouped by tag. All return parsed JSON (or null for 204). Errors throw ApiError.

import { request, tokenStore } from './client';

// ---- Auth (phone-only, Kyrgyzstan +996) -----------------------------------

export const auth = {
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
};

export default { auth, properties, investments, kyc, consent, documents, notifications, audit, admin };

// Typed wrappers around the Atria API (see swagger). One function per operation,
// grouped by tag. All return parsed JSON (or null for 204). Errors throw ApiError.

import { request, tokenStore } from './client';

// ---- Auth (phone-only, Kyrgyzstan +996) -----------------------------------

export const auth = {
  // Admin/staff login (username + password). The access token is kept in memory; the refresh
  // token is set by the server as an HttpOnly cookie and never touches this code.
  adminLogin: async (username, password) => {
    const tokens = await request('/auth/admin/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    });
    tokenStore.set(tokens);
    return tokens;
  },

  // Realtor login (username + password). Same shape as adminLogin but a different endpoint; the
  // role is carried in the JWT.
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

  // Step 2: verify the OTP; creates the account on first use. Returns AuthTokensDto and puts the
  // access token in memory so subsequent calls are authenticated.
  verifyOtp: async (phone, code) => {
    const tokens = await request('/auth/register/phone/verify-otp', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    });
    tokenStore.set(tokens);
    return tokens;
  },

  // Rotate the session. No argument: the refresh token is in an HttpOnly cookie the browser sends
  // on its own, so this code neither holds it nor could read it if it wanted to.
  refresh: async () => {
    const tokens = await request('/auth/refresh', { method: 'POST', body: {}, auth: false });
    tokenStore.set(tokens);
    return tokens;
  },

  /**
   * Restores a session after a page reload.
   *
   * The access token lives in memory and is gone after a refresh of the page, but the HttpOnly
   * cookie is not — so ask the server whether the session is still good. Resolves to true when it
   * is. This replaces reading a token straight out of localStorage, which is what made the token
   * readable by any script on the page in the first place.
   */
  restoreSession: async () => {
    try {
      await auth.refresh();
      return true;
    } catch {
      return false;
    }
  },

  // Ends the session on the SERVER too: revokes the refresh token and expires its cookie. Clearing
  // only the client's copy would leave the token usable for the rest of its thirty days.
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST', body: {}, auth: false });
    } finally {
      tokenStore.clear();
    }
  },
};

// ---- Properties -----------------------------------------------------------

export const properties = {
  // Authenticated: GET /properties is scoped by role on the backend — drafts are admin-only and
  // hidden from anonymous (public-site) callers. The admin panel sends its token so it also sees
  // drafts; the public site calls the same route anonymously and gets coming_soon/open/completed.
  list: () => request('/properties', { auth: true }),
  get: (id) => request(`/properties/${id}`, { auth: true }),
  // Admin only. body: { name, description?, address?, totalValue, tokenPrice, totalTokens, currency }
  // A unit of a building additionally sends { buildingId, unitType, unitNumber?, floorNumber?,
  // roomCount?, totalAreaSqM?, rooms: [{ name, areaSqM }] } — tokens are issued per unit.
  create: (body) => request('/properties', { method: 'POST', body }),
  // Admin only. PATCH: only the supplied fields change. `rooms` replaces the whole breakdown
  // ([] clears it, omitting it leaves it alone); buildingId of all-zero Guid detaches the unit.
  update: (id, body) => request(`/properties/${id}`, { method: 'PATCH', body }),
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
  // Admin only. Uploads one image (max 10/property). Returns { id, url }.
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

// ---- Buildings ------------------------------------------------------------

// A building is the physical object (ЖК / здание) that groups the units sold inside it. It has
// no token supply of its own: every apartment, garage or parking space inside is a property with
// its own issue, created via properties.create({ buildingId, ... }).
export const buildings = {
  // Both list and get return each building together with its `units` (PropertyDto[]).
  // Draft units are staff-only, so the admin token is what makes them visible here.
  list: () => request('/buildings', { auth: true }),
  get: (id) => request(`/buildings/${id}`, { auth: true }),
  // Admin only. body: { name, description?, address?, city?, developer?, yearBuilt?, floors?, buildingType? }
  create: (body) => request('/buildings', { method: 'POST', body }),
  update: (id, body) => request(`/buildings/${id}`, { method: 'PATCH', body }),
  // Admin only. Opens every draft/coming-soon unit of the building in one action; returns
  // { published, alreadyOpen, skipped }. 409 when the building has no units at all.
  publish: (id) => request(`/buildings/${id}/publish`, { method: 'POST' }),
  // Admin only. 409 while the building still holds units — detach or remove them first.
  remove: (id) => request(`/buildings/${id}`, { method: 'DELETE' }),
  // Admin only. Uploads one photo of the building (max 10). Returns { id, url }.
  uploadImage: (id, file, filename) => {
    const form = new FormData();
    form.append('file', file, filename || file.name || 'photo.jpg');
    return request(`/buildings/${id}/images`, { method: 'POST', body: form });
  },
  deleteImage: (id, imageId) =>
    request(`/buildings/${id}/images/${imageId}`, { method: 'DELETE' }),
};

// ---- Investments ----------------------------------------------------------

export const investments = {
  // There is no payment on the platform: an application is reserved, then an operator
  // approves or rejects it. The former POST /investments/{id}/payments endpoint is gone.
  create: (body) => request('/investments', { method: 'POST', body }), // { propertyId, amount }

  // Operator queue. The one investments read that crosses investor boundaries, hence Admin-only.
  // status: Reserved | Active | Rejected | Cancelled | Expired | Annulled.
  list: ({ status, propertyId, take } = {}) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (propertyId) query.set('propertyId', propertyId);
    if (take) query.set('take', String(take));
    const suffix = query.toString();
    return request(`/investments${suffix ? `?${suffix}` : ''}`);
  },

  approve: (id) => request(`/investments/${id}/approve`, { method: 'POST' }),
  reject: (id, reason) => request(`/investments/${id}/reject`, { method: 'POST', body: { reason } }),
  cancel: (id) => request(`/investments/${id}/cancel`, { method: 'POST' }),

  // Аннулирование: единственный поддержанный способ убрать ошибочную или тестовую заявку.
  // Возвращает доли в пул выпуска — чего удаление строки в базе НЕ делает, отчего выпуск
  // молча теряет их навсегда. recordRefund=false, только если денег по заявке не было.
  annul: (id, reason, recordRefund = true) =>
    request(`/investments/${id}/annul`, { method: 'POST', body: { reason, recordRefund } }),
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
  // Asks the provider what it decided, for a verification whose webhook never arrived — Didit
  // gives up after five failed deliveries and the profile then hangs in UnderReview forever.
  // Idempotent: a decided profile comes back unchanged, an undecided one is left alone.
  sync: (id) => request(`/kyc/${id}/sync`, { method: 'POST' }),
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

// ---- Holder register ------------------------------------------------------

// Who holds what in an issue now, and the frozen snapshots recording who held what
// at a given cut. Admin, collateral manager and auditor read it; only the operator
// cuts a snapshot.
export const holders = {
  // search matches an address fragment or a whole investor id.
  registry: (propertyId, search) => {
    const query = new URLSearchParams({ propertyId });
    if (search) query.set('search', search);
    return request(`/holders?${query.toString()}`);
  },
  snapshots: (propertyId) => request(`/holders/snapshots?propertyId=${propertyId}`),
  snapshot: (id) => request(`/holders/snapshots/${id}`),
  // purpose: Payout | Reporting. Idempotent by (property, cut, purpose): asking twice
  // for the same cut returns the snapshot already taken.
  createSnapshot: (body) => request('/holders/snapshots', { method: 'POST', body }),
  // The CSV is rendered server-side, so the operator hands over exactly what the
  // register holds. `raw` keeps the Response so the caller can read it as a blob —
  // a plain <a href> would drop the bearer token and get a 401.
  exportSnapshot: (id) =>
    request(`/holders/snapshots/${id}/export`, { raw: true }),
};

// ---- Whitelist & mint lists -----------------------------------------------

// Every purchase request on its way to being minted, and the batches handed to the
// exchange to mint them. A request enters the queue the moment the investor presses
// buy, becomes mintable once an operator approves the application, and leaves it
// either into a mint list or excluded.
//
// Not the on-chain allowlist (Allowlist.sol) — that is compliance plumbing. This is
// the working queue that decides what gets minted and when.
export const whitelist = {
  // status: Pending | Ready | Batched | Minted | Excluded. Both filters are optional.
  entries: (propertyId, status, take) =>
    request('/whitelist', { query: { propertyId, status, take } }),

  mintLists: (propertyId) => request('/whitelist/mint-lists', { query: { propertyId } }),
  mintList: (id) => request(`/whitelist/mint-lists/${id}`),

  // entryIds empty/omitted takes every mintable request the issue has — the common case.
  createMintList: (propertyId, entryIds, note) =>
    request('/whitelist/mint-lists', { method: 'POST', body: { propertyId, entryIds, note } }),

  // The CSV is rendered server-side, so what the exchange receives is exactly what the
  // batch holds. `raw` keeps the Response so the caller can read it as a blob — a plain
  // <a href> would drop the bearer token and get a 401.
  exportMintList: (id) => request(`/whitelist/mint-lists/${id}/export`, { raw: true }),

  markSent: (id) => request(`/whitelist/mint-lists/${id}/send`, { method: 'POST' }),
  markExecuted: (id) => request(`/whitelist/mint-lists/${id}/execute`, { method: 'POST' }),
  cancelMintList: (id, reason) =>
    request(`/whitelist/mint-lists/${id}/cancel`, { method: 'POST', body: { reason } }),
};

// ---- Payouts --------------------------------------------------------------

// Distributions to the holders of an issue. The platform computes what each holder
// is owed against a frozen snapshot and records what each payment came back with;
// it does not move money. A run is created as a draft that authorises nothing and
// opens for settlement only after a second approval through `governance`.
export const payouts = {
  list: (propertyId) => request(`/payouts?propertyId=${propertyId}`),
  get: (id) => request(`/payouts/${id}`),
  // body: { snapshotId, kind, method, declaredAmount, currency, note }
  create: (body) => request('/payouts', { method: 'POST', body }),
  settle: (id, itemId, settlementReference) =>
    request(`/payouts/${id}/items/${itemId}/settle`, {
      method: 'POST',
      body: { settlementReference },
    }),
  fail: (id, itemId, reason) =>
    request(`/payouts/${id}/items/${itemId}/fail`, { method: 'POST', body: { reason } }),
  complete: (id) => request(`/payouts/${id}/complete`, { method: 'POST' }),
  cancel: (id, reason) => request(`/payouts/${id}/cancel`, { method: 'POST', body: { reason } }),
};

// ---- Governance (two-person rule) -----------------------------------------

// Starting a distribution, publishing an issue and blocking an investor take two
// people: one raises the request, a different account decides it.
export const governance = {
  // kind: PayoutRun | InvestorBlock; targetId is the entity. Publishing an issue is NOT a
  // critical action — an admin opens an offering directly via properties.publish / buildings.publish.
  request: (kind, targetId, reason) =>
    request('/governance/critical-actions', { method: 'POST', body: { kind, targetId, reason } }),
  pending: () => request('/governance/critical-actions/pending'),
  decided: (take = 50) => request(`/governance/critical-actions/decided?take=${take}`),
  approve: (id) => request(`/governance/critical-actions/${id}/approve`, { method: 'POST' }),
  reject: (id, note) =>
    request(`/governance/critical-actions/${id}/reject`, { method: 'POST', body: { note } }),
  withdraw: (id) => request(`/governance/critical-actions/${id}/withdraw`, { method: 'POST' }),
};

export default {
  auth,
  whitelist,
  properties,
  buildings,
  investments,
  holders,
  payouts,
  governance,
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

// Adapters between backend DTOs and the shapes the dashboard components expect.

// Backend properties carry no imagery yet — use a neutral placeholder so cards render.
const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800';

/**
 * PropertyDto (swagger) -> dashboard property.
 * The backend model is leaner than the UI's; fields it doesn't provide
 * (type, city, developer, floors, images, …) are left empty/defaulted.
 */
// Backend property lifecycle (draft|open|completed) -> dashboard status
// (draft|active|archived). Falls back to isActive for older payloads without `status`.
function mapPropertyStatus(status, isActive) {
  switch ((status || '').toLowerCase()) {
    case 'open':
      return 'active';
    case 'completed':
      return 'archived';
    case 'coming_soon':
    case 'comingsoon':
    case 'announced':
      return 'coming_soon';
    case 'draft':
      return 'draft';
    default:
      return isActive ? 'active' : 'draft';
  }
}

export function mapPropertyFromApi(p) {
  // Backend now returns real photos (PropertyImageDto { id, url }); fall back to a
  // placeholder only when the property has none.
  const apiImages = Array.isArray(p.images)
    ? p.images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
    : [];
  const images = apiImages.length > 0 ? apiImages : [PLACEHOLDER_IMAGE];

  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    // Backend lifecycle -> dashboard status. Single source of truth shared with the site:
    //   draft        -> admin-only (hidden from the public site)
    //   coming_soon  -> "скоро в продаже" (public site: "Скоро")
    //   open          -> "открыт к покупке" (open for purchase)
    //   completed     -> "распродан" (sold out / archived)
    // A fully sold-out open offering (availableTokens === 0) is shown as sold out even if
    // the backend hasn't flipped it to completed yet (backend should ideally auto-complete).
    status:
      mapPropertyStatus(p.status, p.isActive) === 'active' && p.availableTokens === 0
        ? 'archived'
        : mapPropertyStatus(p.status, p.isActive),

    // Token economics (live on the property in this backend).
    currency: p.currency,
    tokenPrice: p.tokenPrice,
    availableTokens: p.availableTokens,
    totalTokens: p.totalTokens,

    // Sales temporarily halted by admin — the public site must block "buy" while true.
    // Backend flag name TBD; accept a few likely spellings.
    paused: !!(p.salesPaused ?? p.isPaused ?? p.paused),

    // Object-info characteristics, now persisted on the backend (PropertyDto). Country is not
    // stored server-side yet, so it stays empty.
    type: p.propertyType || '',
    city: p.city || '',
    country: '',
    address: p.address || '',
    developer: p.developer || '',
    floors: p.floors ?? null,
    completionYear: p.yearBuilt ?? null,
    images,
    image: images[0],

    // Documents persisted on the backend (PropertyDocumentDto { id, url, fileName, contentType }).
    documents: Array.isArray(p.documents)
      ? p.documents.map((d) => ({ id: d.id, fileName: d.fileName, url: d.url, contentType: d.contentType }))
      : [],

    _source: 'api',
  };
}

// Backend KYC status (Pending|UnderReview|Approved|Rejected) -> dashboard status.
function mapKycStatus(status) {
  switch (status) {
    case 'Approved':
      return 'Approved';
    case 'Rejected':
      return 'Failed';
    case 'UnderReview':
    case 'Pending':
      return 'Pending';
    default:
      return 'Pending';
  }
}

/**
 * Investor registry row (proposed backend DTO: user ⋈ kyc_profile) -> dashboard investor.
 * Defensive about missing fields so partial payloads still render. The backend is
 * phone-only, so `phone` stands in for the contact where the UI expects an email.
 */
export function mapInvestorFromApi(dto) {
  const phone = dto.phoneNumber || dto.phone || '';
  return {
    id: dto.id,
    name: dto.fullName || dto.name || phone || 'Без имени',
    email: dto.email || phone || '—',
    phone,
    walletAddress: dto.walletAddress || '',
    // status is null for users with no KYC profile yet.
    kycStatus: dto.status || dto.kycStatus ? mapKycStatus(dto.status || dto.kycStatus) : 'Pending',
    amlRisk: dto.amlRisk || 'N/A',
    pepStatus: dto.pepStatus || 'N/A',
    verificationDate: (dto.verificationDate || dto.createdAtUtc || '').slice(0, 10),
    status: dto.blocked ? 'Blocked' : 'Active',
    nationalID: dto.documentNumber || dto.nationalID || '—',
    country: dto.nationality || dto.country || '—',
    // No holdings in the registry payload; kept empty so the UI's calculations are safe.
    holdings: Array.isArray(dto.holdings) ? dto.holdings : [],
    _source: 'api',
  };
}

/**
 * Mapped dashboard property -> investment placement (offering).
 * The backend has no separate offering entity; each property IS an offering:
 * target = totalTokens×tokenPrice, raised = (totalTokens−available)×tokenPrice.
 */
export function mapPlacementFromProperty(p) {
  const tokenSupply = p.totalTokens ?? 0;
  const available = p.availableTokens ?? tokenSupply;
  const sold = Math.max(0, tokenSupply - available);
  const tokenPrice = p.tokenPrice ?? 0;
  return {
    id: `plc-${String(p.id).slice(0, 8)}`,
    propertyId: p.id,
    propertyName: p.name,
    tokenPrice,
    tokenSupply,
    targetAmount: tokenSupply * tokenPrice,
    raisedAmount: sold * tokenPrice,
    status: p.status === 'active' ? 'active' : p.status === 'archived' ? 'completed' : 'draft',
    investorsCount: 0, // not exposed by the API yet
    launchDate: '—',
    endDate: '—',
    currency: p.currency || 'USD',
    description: p.description || `Публичное размещение долей объекта «${p.name}».`,
    _source: 'api',
  };
}

/**
 * Investment row for a property (proposed backend DTO) -> holder row for the object card.
 * Tokens are taken as-is, or derived from amount / tokenPrice when the backend omits them.
 */
export function mapHolderFromInvestment(dto, property = {}) {
  const tokenPrice = property.tokenPrice;
  const tokens =
    dto.tokens ??
    (dto.amount != null && tokenPrice ? Math.round(dto.amount / tokenPrice) : null);
  return {
    id: dto.id || dto.userId || dto.investmentId,
    name: dto.fullName || dto.investorName || dto.name || dto.phoneNumber || dto.phone || 'Инвестор',
    walletAddress: dto.walletAddress || '',
    tokens,
    amount: dto.amount ?? null,
    currency: dto.currency || property.currency || 'USD',
    // Backend may send the share directly; otherwise the UI derives it from tokens.
    sharePercent: dto.sharePercent ?? dto.share ?? null,
    status: dto.status || null,
    _source: 'api',
  };
}

/**
 * One row of an investor's portfolio (proposed GET /users/{id}/investments) -> holding.
 * Only Active investments count as "owned shares". Accepts a few likely field spellings
 * so a small backend naming difference doesn't blank the card.
 */
export function mapInvestorHoldingFromApi(dto) {
  return {
    propertyId: dto.propertyId || null,
    propertyName: dto.propertyName || dto.property?.name || 'Объект',
    tokensOwned: dto.tokenCount ?? dto.tokens ?? 0,
    amount: dto.amount ?? null,
    currency: dto.currency || 'USD',
    // Share of the property the investor holds; null if the backend doesn't send it.
    sharePercent: dto.sharePercent ?? dto.share ?? null,
    status: dto.status || null,
  };
}

/**
 * Staff/admin row (proposed GET /admins) -> super-admin panel row.
 * `role: 'admin'` tags the row so the panel shows password controls (admins have
 * passwords; investors don't).
 */
export function mapAdminFromApi(dto) {
  return {
    id: dto.id || dto.userId,
    name: dto.fullName || dto.username || dto.name || 'Администратор',
    username: dto.username || '',
    email: dto.email || '',
    role: 'admin',
    status: dto.blocked ? 'Blocked' : 'Active',
    _source: 'api',
  };
}

/**
 * Realtor leaderboard row (proposed GET /realtors/stats) -> dashboard realtor.
 * `closedDeals` drives the ranking and tier; accepts a few likely field spellings.
 */
export function mapRealtorStatFromApi(dto) {
  return {
    id: dto.id || dto.userId || dto.realtorId,
    fullName: dto.fullName || dto.name || 'Риелтор',
    companyName: dto.companyName || dto.company || '',
    closedDeals: dto.closedDeals ?? dto.completedDeals ?? dto.succeededDeals ?? 0,
    totalDeals: dto.totalDeals ?? dto.dealsCount ?? null,
    // Banned by a super admin — drives the moderation status in the super-admin panel.
    status: dto.blocked ? 'Blocked' : 'Active',
    _source: 'api',
  };
}

// Backend ticket status (open|pending|closed) -> dashboard status (Open|Answered|Resolved).
// `open` = awaiting first support reply, `pending` = support answered / awaiting investor,
// `closed` = resolved. Priority has no backend counterpart — defaulted to Medium.
function mapTicketStatus(status) {
  switch ((status || '').toLowerCase()) {
    case 'closed':
      return 'Resolved';
    case 'pending':
      return 'Answered';
    case 'open':
    default:
      return 'Open';
  }
}

// Backend date-time (ISO) -> the "YYYY-MM-DD HH:MM:SS" the UI renders verbatim.
function fmtTs(iso) {
  return iso ? String(iso).replace('T', ' ').substring(0, 19) : '';
}

/**
 * TicketMessageDto (swagger) -> dashboard message. `author` is 'investor' | 'support'.
 */
export function mapTicketMessageFromApi(m, investorName = '') {
  const sender = m.author === 'support' ? 'support' : 'investor';
  return {
    id: m.id,
    sender,
    senderName:
      m.authorName || (sender === 'support' ? 'Поддержка ATRIA RWA' : investorName || 'Инвестор'),
    timestamp: fmtTs(m.createdAtUtc),
    text: m.body || '',
  };
}

/**
 * TicketDto (swagger) -> dashboard ticket. On the list route `messages` and `investor`
 * detail may be absent; those are filled in when a single ticket is fetched by id.
 * The backend is phone-only, so no email — the investor's full name stands in.
 */
export function mapTicketFromApi(t) {
  // A ticket may be opened by an investor or a realtor. The backend flags this via
  // `requesterRole`/`authorRole` (or a `realtor` object); default to investor.
  const rawRole = (t.requesterRole || t.authorRole || (t.realtor ? 'realtor' : 'investor'))
    .toString()
    .toLowerCase();
  const requesterRole = rawRole === 'realtor' ? 'realtor' : 'investor';
  const requesterName =
    requesterRole === 'realtor'
      ? t.realtor?.fullName || t.requesterName || 'Риелтор'
      : t.investor?.fullName || t.requesterName || 'Инвестор';
  const messages = Array.isArray(t.messages)
    ? t.messages.map((m) => mapTicketMessageFromApi(m, requesterName))
    : [];
  return {
    id: t.id,
    requesterRole,
    investorId: t.investor?.id || t.realtor?.id || null,
    investorName: requesterName,
    investorEmail: '—', // phone-only backend; no email on tickets
    subject: t.subject || '',
    category: t.category || '',
    priority: 'Medium', // not modelled on the backend; UI-only
    status: mapTicketStatus(t.status),
    createdAt: fmtTs(t.createdAtUtc),
    updatedAt: fmtTs(t.updatedAtUtc || t.createdAtUtc),
    messages,
    _source: 'api',
  };
}

// ---- Audit log ------------------------------------------------------------

// This is the ADMIN journal: it records what an administrator does in this panel, plus
// the ticket traffic they have to react to. Investor-side activity (referral deals,
// investments, payments, KYC vetting, DID/allowlist) belongs to other sections and is
// filtered out — an allowlist, so new backend event types never leak in on their own.
//
// `summary` is nullable and the backend does leave it empty for some rows, which would
// render as a blank line; these labels are the fallback. Server-composed copy still wins
// whenever it is present.
const AUDIT_EVENT_LABELS = {
  // 1. Objects: created, edited, announced as "coming soon", published.
  PropertyCreated: 'Объект создан',
  PropertyUpdated: 'Объект изменён',
  PropertyAnnounced: 'Объект помечен «Скоро в продаже»',
  PropertyPublished: 'Объект опубликован',
  PropertyUnannounced: 'Объект возвращён в черновики',
  PropertyCompleted: 'Объект закрыт (распродан)',
  PropertyPaused: 'Продажи приостановлены',
  PropertyResumed: 'Продажи возобновлены',

  // 2. Ticket arrived / ticket closed.
  TicketOpened: 'Поступил тикет',
  TicketClosed: 'Тикет закрыт',
  TicketReopened: 'Тикет переоткрыт',

  // 3. News / financial report published.
  PublicationPublished: 'Опубликована новость / финотчёт',
  PublicationRemoved: 'Публикация снята с ленты',
};

// Only these events belong in the admin journal.
const AUDIT_ALLOWED_EVENTS = new Set(Object.keys(AUDIT_EVENT_LABELS));

// Older rows still carry the raw domain-event class name ("TicketClosedEvent"); newer
// ones are already stripped. Normalize both to the bare action name.
export function normalizeEventType(eventType) {
  return String(eventType || '').replace(/Event$/, '');
}

// CamelCase -> "Camel case", so an unmapped event still reads as words, not a class name.
function humanizeEventType(eventType) {
  if (!eventType) return 'Системное событие';
  const words = String(eventType).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function auditEventLabel(eventType) {
  const name = normalizeEventType(eventType);
  return AUDIT_EVENT_LABELS[name] || humanizeEventType(name);
}

/**
 * AuditLogDto -> dashboard audit row.
 *
 * `actorName` is null for system-generated entries, and is NOT always an admin — a
 * ticket is opened by an investor, so the column is "Исполнитель", not "Администратор".
 * There is no IP address on the entry: the backend doesn't record one, so the UI must
 * not show a column for it (it used to display a hardcoded fake IP).
 */
// Which aggregate an event belongs to. Older rows put the event name in `entityType`
// ("DealCreated"), so the raw value can't be trusted for the entity filter — derive it
// from the action name instead.
const EVENT_ENTITY = [
  [/^Property/, 'Объекты'],
  [/^Ticket/, 'Тикеты'],
  [/^Publication/, 'Публикации'],
];

function auditEntityType(a) {
  const name = normalizeEventType(a.eventType);
  return EVENT_ENTITY.find(([re]) => re.test(name))?.[1] || '';
}

export function mapAuditLogFromApi(a) {
  return {
    id: a.id,
    timestamp: fmtTs(a.occurredOnUtc),
    adminName: a.actorName || 'Система',
    // Server-composed Russian copy when present; a readable event name otherwise, so
    // the journal never shows an empty description.
    details: a.summary?.trim() || auditEventLabel(a.eventType),
    status: (a.severity || 'success').toUpperCase(), // SUCCESS | WARNING | ALERT
    entityType: auditEntityType(a),
    // Kept for filtering/search only, never displayed as a column.
    eventType: normalizeEventType(a.eventType),
    _source: 'api',
  };
}

/**
 * Does this entry belong in the admin journal?
 * Only admin-panel actions (object lifecycle, ticket traffic, publications). Everything
 * else the backend records — referral deals, investments, payments, KYC vetting, DID —
 * is investor-side activity and is excluded.
 */
export function isAdminAuditEntry(a) {
  return AUDIT_ALLOWED_EVENTS.has(normalizeEventType(a.eventType));
}

// ---- Publications ---------------------------------------------------------
// Backend enum (snake_case) <-> the labels the dashboard's PUB_TYPES use.

const PUB_TYPE_FROM_API = {
  financial_report: 'Financial Report',
  news_release: 'News Release',
  valuation_audit: 'Valuation Audit',
  general_news: 'General News',
};

const PUB_TYPE_TO_API = Object.fromEntries(
  Object.entries(PUB_TYPE_FROM_API).map(([api, ui]) => [ui, api])
);

export function mapPublicationTypeToApi(uiType) {
  return PUB_TYPE_TO_API[uiType] || 'general_news';
}

/**
 * PublicationDto -> dashboard publication.
 * `propertyId` is null for general (object-less) news; the UI already renders those
 * as "Общая публикация", so the null is passed through rather than defaulted.
 */
export function mapPublicationFromApi(p) {
  return {
    id: p.id,
    title: p.title || '',
    // The UI calls the message text `summary` and renders it whitespace-preserved.
    summary: p.body || '',
    // Feed cards show a plain date; publishedAtUtc is the sort key on the backend.
    date: (p.publishedAtUtc || p.createdAtUtc || '').slice(0, 10),
    propertyId: p.propertyId || null,
    propertyName: p.propertyName || null,
    type: PUB_TYPE_FROM_API[p.type] || p.type || 'General News',
    status: p.status === 'draft' ? 'Draft' : 'Published',
    _source: 'api',
  };
}

/**
 * Dashboard publish-form data -> CreatePublicationRequest.
 * An empty propertyId means "general news" and must go over the wire as null.
 */
export function mapPublicationToCreateRequest({ type, title, summary, propertyId }) {
  return {
    type: mapPublicationTypeToApi(type),
    title: title.trim(),
    body: summary.trim(),
    propertyId: propertyId || null,
  };
}

/**
 * Dashboard create-form data -> CreatePropertyRequest (swagger).
 * Only the fields the backend accepts are sent.
 */
export function mapPropertyToCreateRequest(form) {
  const tokenPrice = Number(form.tokenPrice ?? 0);
  const totalTokens = Number(form.totalTokens ?? 0);
  // Backend requires totalValue > 0; default it to price × supply when not given.
  const totalValue = Number(form.totalValue ?? form.currentValuation ?? tokenPrice * totalTokens);
  return {
    name: form.name,
    description: form.description || null,
    address: form.address || null,
    totalValue,
    tokenPrice,
    totalTokens,
    currency: form.currency || 'USD',
    // Descriptive characteristics (optional) — now persisted by the backend.
    propertyType: form.type || null,
    city: form.city || null,
    yearBuilt: form.completionYear != null && form.completionYear !== '' ? Number(form.completionYear) : null,
    developer: form.developer || null,
    floors: form.floors != null && form.floors !== '' ? Number(form.floors) : null,
  };
}

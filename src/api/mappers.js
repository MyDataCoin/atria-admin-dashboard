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
    status: mapPropertyStatus(p.status, p.isActive),

    // Token economics (live on the property in this backend).
    currency: p.currency,
    tokenPrice: p.tokenPrice,
    availableTokens: p.availableTokens,
    totalTokens: p.totalTokens,

    // Object-info fields the backend doesn't expose yet.
    type: '',
    city: '',
    country: '',
    address: '',
    developer: '',
    floors: null,
    completionYear: null,
    images,
    image: images[0],

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
  const investorName = t.investor?.fullName || 'Инвестор';
  const messages = Array.isArray(t.messages)
    ? t.messages.map((m) => mapTicketMessageFromApi(m, investorName))
    : [];
  return {
    id: t.id,
    investorId: t.investor?.id || null,
    investorName,
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
  };
}

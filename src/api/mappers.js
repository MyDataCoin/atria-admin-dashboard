// Adapters between backend DTOs and the shapes the dashboard components expect.

// Backend properties carry no imagery yet — use a neutral placeholder so cards render.
const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800';

/**
 * PropertyDto (swagger) -> dashboard property.
 * The backend model is leaner than the UI's; fields it doesn't provide
 * (type, city, developer, floors, images, …) are left empty/defaulted.
 */
export function mapPropertyFromApi(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    status: p.isActive ? 'active' : 'draft',

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
    images: [PLACEHOLDER_IMAGE],
    image: PLACEHOLDER_IMAGE,

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
 * Dashboard create-form data -> CreatePropertyRequest (swagger).
 * Only the fields the backend accepts are sent.
 */
export function mapPropertyToCreateRequest(form) {
  return {
    name: form.name,
    description: form.description || null,
    address: form.address || null,
    totalValue: Number(form.totalValue ?? form.currentValuation ?? 0),
    tokenPrice: Number(form.tokenPrice ?? 0),
    totalTokens: Number(form.totalTokens ?? 0),
    currency: form.currency || 'USD',
  };
}

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

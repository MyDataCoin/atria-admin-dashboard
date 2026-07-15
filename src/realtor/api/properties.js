// Каталог объектов из ATRIA API (GET /api/v1/properties — анонимный).
//
// Данные API беднее, чем ожидает UI: у объектов нет фото, города, года постройки,
// истории. Реальные поля берём из API, а недостающие закрываем детерминированными
// демо-заглушками (fillGaps), чтобы карточка выглядела цельной. Всё бутафорское
// помечено в объекте флагом _mock, чтобы позже такие поля легко найти и убрать.

import { request } from '../../api/client';

// Демо-фото под тип объекта — API их не отдаёт (images: []).
const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'
];

// Статусы продаж из API → статусы модерации, которыми оперирует UI.
const STATUS_MAP = {
  open: 'published',
  completed: 'published',
  paused: 'needs_improvement',
  draft: 'draft'
};

// Стабильный индекс из id, чтобы заглушки у объекта не «прыгали» между рендерами.
function hashIndex(id, mod) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

// Медиа (фото/документы) отдаётся без CORS-заголовков, поэтому абсолютный URL
// с домена API браузер не даст ни отрисовать в canvas (PDF), ни скачать (fetch).
// Приводим к относительному /media/... — в dev его перехватывает прокси Vite,
// в проде фронт живёт на том же разрешённом origin.
function toMediaUrl(url) {
  if (!url) return null;
  const i = url.indexOf('/media/');
  return i >= 0 ? url.slice(i) : url;
}

// Картинка из API приходит объектом {id, url}; на всякий случай поддерживаем и строку.
function toImageUrl(img) {
  if (!img) return null;
  return toMediaUrl(typeof img === 'string' ? img : img.url || null);
}

// Город вытаскиваем из адреса ("..., Bishkek" → "Bishkek"), когда API отдаёт city: null.
function cityFromAddress(address) {
  if (!address) return null;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

/** Приводит объект API к форме, которую рисует UI, с заглушками на пустых полях. */
function normalize(p) {
  const totalValue =
    typeof p.tokenPrice === 'number' && typeof p.totalTokens === 'number'
      ? p.tokenPrice * p.totalTokens
      : null;

  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    address: p.address || '',

    // Реальные токен-данные из API — пробрасываем как есть.
    tokenPrice: p.tokenPrice,
    availableTokens: p.availableTokens,
    totalTokens: p.totalTokens,
    currency: p.currency,
    salesPaused: p.salesPaused,
    apiStatus: p.status,

    // price в UI = полная стоимость объекта (цена токена × число токенов),
    // а НЕ цена одного токена — иначе цифра вводит в заблуждение.
    price: totalValue,
    status: STATUS_MAP[p.status] || 'published',

    // Поля, которых в API нет (null / пусто) — демо-заглушки.
    city: p.city || cityFromAddress(p.address),
    country: p.city ? null : 'Кыргызстан',
    type: p.propertyType || 'Коммерческая недвижимость',
    yearBuilt: p.yearBuilt ?? 2015 + hashIndex(p.id, 9),
    floorsCount: p.floors ?? 3 + hashIndex(p.id, 20),
    area: 200 + hashIndex(p.id, 800),
    // API отдаёт картинки объектами {id, url} — UI ждёт массив URL-строк.
    // Заглушка используется, только если реальных фото нет.
    images: p.images?.length ? p.images.map(toImageUrl).filter(Boolean) : [STOCK_IMAGES[hashIndex(p.id, STOCK_IMAGES.length)]],
    // Документы: {id, url, fileName, contentType}; url — через прокси (см. toMediaUrl).
    documents: (p.documents || []).map((d) => ({ ...d, url: toMediaUrl(d.url) })),
    hasRealImages: Boolean(p.images?.length),
    history: [],
    comments: [],
    publishedAt: null,
    createdAt: null,

    // Какие поля выше — бутафория; помогает вычистить, когда API их начнёт отдавать.
    _mock: ['country', 'type', 'yearBuilt', 'floorsCount', 'area', 'history']
  };
}

/** Весь каталог объектов, нормализованный под UI. */
export async function fetchProperties() {
  const list = await request('/properties', { auth: false });
  return (list || []).map(normalize);
}

/**
 * Число зарегистрированных инвесторов для карточки «База инвесторов» на главной.
 * Эндпоинт Realtor-only — требует авторизации (request добавляет Bearer-токен).
 */
export async function fetchInvestorCount() {
  return request('/deals/investor-count');
}

/** Один объект по id (нормализованный). */
export async function fetchProperty(id) {
  return normalize(await request(`/properties/${id}`, { auth: false }));
}

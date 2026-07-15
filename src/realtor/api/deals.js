// Реферальные сделки риелтора из ATRIA API. Все эндпоинты Realtor-only —
// apiFetch подставляет Bearer-токен.
//
// Модель API проще старой фронтовой: сервер знает про реф-ссылку, процент, статус
// и срок, но НЕ про инвестора, число купленных токенов и сумму комиссии — их в
// контракте нет, поэтому эти поля больше не показываем (были фронтовой симуляцией).

import { request } from '../../api/client';

// Статусы сделки из API → статусы, которыми оперирует фронтовая карточка.
// pending — ссылка создана, ждём инвестора; matched — по ссылке пришла инвестиция.
const STATUS_MAP = {
  pending: 'pending',
  matched: 'success',
  expired: 'rejected',
  cancelled: 'rejected'
};

/** Приводит сделку API к форме, которую рисует DealsView. */
function normalize(d) {
  const expiresAt = d.expiresAtUtc ? new Date(d.expiresAtUtc).getTime() : null;

  return {
    id: d.id,
    propertyId: d.propertyId,
    realtorPercent: d.commissionPercent,
    status: STATUS_MAP[d.status] || 'pending',
    apiStatus: d.status,

    // Реф-ссылка приходит готовой от сервера (генерировать локально больше не нужно).
    refLink: d.referralUrl || null,
    referralToken: d.referralToken || null,
    // Срок жизни ссылки задаёт сервер (14 дней); фронт по нему считает обратный отсчёт.
    expiresAt,

    matchedInvestmentId: d.matchedInvestmentId || null
  };
}

/** Все реферальные сделки текущего риелтора. */
export async function fetchDeals() {
  const list = await request('/deals/me');
  return (list || []).map(normalize);
}

/**
 * Создаёт реферальную сделку на объект и возвращает её (уже с реф-ссылкой).
 * commissionPercent — 0..100.
 */
export async function createDeal(propertyId, commissionPercent) {
  const created = await request('/deals', {
    method: 'POST',
    body: { propertyId, commissionPercent }
  });
  return normalize(created);
}

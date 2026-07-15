// Хелп-деск риелтора поверх ATRIA API (/api/v1/support/tickets).
// Тикет от риелтора попадает в общий тикет-деск админа; админ отвечает в том же
// треде. Все эндпоинты требуют авторизации — apiFetch подставляет Bearer-токен.
//
// Автор сообщения (`author`) от сервера: 'investor' — сообщение риелтора/инвестора,
// 'support' — ответ администратора. Имя автора (authorName) API пока не заполняет.

import { request } from '../../api/client';

/** Одно сообщение треда в форме, удобной для UI. */
function normalizeMessage(m) {
  return {
    id: m.id,
    // 'support' — ответ администратора; всё остальное — сторона риелтора.
    fromAdmin: m.author === 'support',
    authorName: m.authorName || null,
    text: m.body,
    createdAt: m.createdAtUtc ? new Date(m.createdAtUtc).getTime() : null
  };
}

/** Приводит тикет API к форме, которую рисует HelpDeskView. */
function normalizeTicket(t) {
  return {
    id: t.id,
    subject: t.subject,
    category: t.category,
    status: t.status, // 'open' | 'pending' | 'closed'
    createdAt: t.createdAtUtc ? new Date(t.createdAtUtc).getTime() : null,
    updatedAt: t.updatedAtUtc ? new Date(t.updatedAtUtc).getTime() : null,
    messages: (t.messages || []).map(normalizeMessage)
  };
}

/** Список тикетов текущего риелтора (только свои). */
export async function fetchTickets() {
  const list = await request('/support/tickets');
  return (list || []).map(normalizeTicket);
}

/** Один тикет с полным тредом сообщений. */
export async function fetchTicket(id) {
  return normalizeTicket(await request(`/support/tickets/${id}`));
}

/** Создаёт тикет; первое сообщение — текст body. Возвращает тикет с тредом. */
export async function createTicket({ subject, category, body }) {
  const created = await request('/support/tickets', {
    method: 'POST',
    body: { subject, category, body }
  });
  return normalizeTicket(created);
}

/** Добавляет сообщение в тред тикета; возвращает созданное сообщение. */
export async function postMessage(ticketId, body) {
  const msg = await request(`/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: { body }
  });
  return normalizeMessage(msg);
}

/** Закрывает тикет. */
export async function closeTicket(ticketId) {
  return request(`/support/tickets/${ticketId}/close`, { method: 'POST' });
}

/** Переоткрывает закрытый тикет. */
export async function reopenTicket(ticketId) {
  return request(`/support/tickets/${ticketId}/reopen`, { method: 'POST' });
}

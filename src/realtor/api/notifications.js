// Уведомления пользователя из ATRIA API (/api/v1/notifications).
// Требуют авторизации — apiFetch подставляет Bearer-токен. Сейчас бэк шлёт
// уведомления по событиям реферальной сделки (шаблоны Deal*).

import { request } from '../../api/client';

// template от сервера → тип для UI (иконка/цвет) + русский заголовок.
// Сервер отдаёт title/body по-английски, поэтому заголовок локализуем здесь,
// а body (в нём название объекта, %, id сделки) показываем как есть.
const TEMPLATES = {
  // События реферальной сделки. title/body от сервера — на английском.
  DealCreated:   { type: 'info',    title: 'Сделка создана' },
  DealSucceeded: { type: 'success', title: 'Сделка завершена' },
  DealRejected:  { type: 'warning', title: 'Сделка отклонена' },

  // События тикета хелп-деска. Здесь сервер уже отдаёт русский title.
  TicketOpened:  { type: 'info',    title: 'Тикет отправлен' },
  TicketReplied: { type: 'success', title: 'Ответ на тикет' },
  TicketClosed:  { type: 'info',    title: 'Тикет закрыт' }
};

function normalize(n) {
  const tpl = TEMPLATES[n.template];
  return {
    id: n.id,
    template: n.template,
    // Локализованный заголовок, если шаблон известен; иначе — то, что прислал сервер.
    title: tpl?.title || n.title,
    message: n.body,
    read: n.isRead,
    type: tpl?.type || 'info',
    date: n.createdAtUtc ? new Date(n.createdAtUtc).getTime() : null
  };
}

/** Все уведомления текущего пользователя, новые первыми. */
export async function fetchNotifications() {
  const list = await request('/notifications/me');
  // Сервер отдаёт старые сверху, поэтому сортируем сами: новые — первыми.
  return (list || []).map(normalize).sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
}

/** Отмечает уведомление прочитанным (идемпотентно). */
export async function markRead(id) {
  return request(`/notifications/${id}/read`, { method: 'POST' });
}

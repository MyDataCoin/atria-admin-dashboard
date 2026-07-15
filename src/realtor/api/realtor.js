// Бизнес-профиль риелтора из ATRIA API (realtor_profiles).
// Realtor-only — apiFetch подставляет Bearer-токен. 404, если профиля нет.

import { request } from '../../api/client';

/**
 * Профиль текущего риелтора: имя, должность, кошелёк, компания, рег.номер, адрес.
 * Email/телефон API не отдаёт (их и не показываем).
 */
export async function fetchRealtorProfile() {
  return request('/realtor/me');
}

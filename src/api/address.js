// Подсказки адреса «как в Яндексе» поверх OpenStreetMap (Nominatim): короткая первая строка
// «проспект Аалы Токомбаева, 21/5А», район и город второй строкой, без повторов.
//
// Nominatim возвращает каждый отрезок улицы отдельной записью с полным display_name — отсюда
// пять одинаковых «проспект Аалы Токомбаева, микрорайон …». И дома в Кыргызстане в OSM есть
// далеко не все, поэтому номер, который ввёл человек, теряться не должен: если в ответе дома
// нет, подставляем введённый.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

// Номер дома в конце строки: «21», «21/5А», «12-1», «4б», «д. 7».
const HOUSE_AT_END = /^(.*?)(?:,\s*|\s+)(?:д\.?\s*)?(\d+[0-9а-яa-z/-]*)\s*$/i;

/** «Аалы Токомбаева 21/5А» -> { street: 'Аалы Токомбаева', house: '21/5А' }. */
export function splitHouse(input) {
  const text = (input || '').trim();
  const m = text.match(HOUSE_AT_END);
  return m && m[1].trim().length >= 2 ? { street: m[1].trim(), house: m[2] } : { street: text, house: '' };
}

/** «город Бишкек» -> «Бишкек». */
function cleanCity(name) {
  return (name || '').replace(/^\s*(город|г\.)\s*/i, '').trim();
}

/** Одна подсказка в виде, который показываем и сохраняем. */
function toSuggestion(hit, typedHouse) {
  const a = hit.address || {};
  const road = a.road || a.pedestrian || a.residential || a.square || a.neighbourhood || hit.name || '';
  const house = a.house_number || typedHouse;
  const city = cleanCity(a.city || a.town || a.village || a.county || a.state);
  const title = [road, house].filter(Boolean).join(', ') || hit.display_name;
  // Второй строкой — где это: микрорайон, район, город. Без индекса и страны.
  const area = [a.suburb || a.quarter || a.neighbourhood, a.city_district, city]
    .filter((x, i, arr) => x && x !== road && arr.indexOf(x) === i);
  return {
    id: hit.place_id,
    title,
    subtitle: area.join(', '),
    city,
    // Что ляжет в поле «Адрес»: город и улица с домом, как пишут в документах.
    value: [city, title].filter(Boolean).join(', '),
  };
}

const cache = new Map();

/**
 * Подсказки для введённой строки. `viewbox` — границы города (или null — по всей стране).
 * Повторный запрос той же строки берётся из кэша: при стирании и наборе заново — мгновенно.
 */
export async function suggestAddresses(input, viewbox, signal) {
  const { street, house } = splitHouse(input);
  const key = `${viewbox || ''}|${input.trim().toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  const search = async (q) => {
    const url =
      `${NOMINATIM}?format=jsonv2&addressdetails=1&limit=10&countrycodes=kg&accept-language=ru` +
      `&q=${encodeURIComponent(q)}` +
      (viewbox ? `&viewbox=${viewbox}&bounded=1` : '');
    // referrerPolicy: иначе Referer выдал бы стороннему сервису адрес внутренней админ-панели.
    const res = await fetch(url, { headers: { Accept: 'application/json' }, referrerPolicy: 'no-referrer', signal });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  // Сначала как ввели. Дома нет в OSM — ищем улицу без номера, а номер подставляем сами.
  let hits = await search(input);
  if (hits.length === 0 && house) hits = await search(street);

  const seen = new Set();
  const result = [];
  for (const hit of hits) {
    const s = toSuggestion(hit, house);
    // Порядок слов не важен: в OSM одна улица записана и «проспект Чуй», и «Чуй проспект».
    const words = s.title.toLowerCase().replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean).sort();
    const dedupeKey = `${words.join(' ')}|${s.city.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(s);
    if (result.length === 6) break;
  }
  cache.set(key, result);
  return result;
}

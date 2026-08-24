/**
 * Returns a URL safe to use in an `href`/`src`, or `undefined` if the scheme is
 * not http(s). React does NOT sanitize `href`, so a `javascript:`/`data:` URL
 * coming from API data would execute on click; only allow web links through.
 */
export function safeUrl(url) {
  if (typeof url !== 'string') return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url : undefined;
}

/**
 * Formats a monetary amount for display in Kyrgyz som (KGS).
 *
 * Amounts already arrive in KGS from the backend — the platform issues, prices and
 * pays in som only — so there is NO FX conversion here. This function used to treat
 * its input as USD and multiply by 87, which turned a 7 260 000 сом issue into
 * 631 620 000 с on screen; call sites had started bypassing it with their own
 * formatters to avoid that. The `currency` argument is kept for call-site
 * compatibility but ignored: everything renders in som.
 */
export function formatVal(amount, currency = 'KGS', includeFraction = false) {
  const value = Number(amount ?? 0);

  let formatted;
  if (includeFraction) {
    formatted = value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (value < 1000 && value % 1 !== 0) {
    formatted = value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    formatted = Math.round(value).toLocaleString('ru-RU');
  }

  return `${formatted} с`;
}

/**
 * Разовый пароль для нового аккаунта админа/риелтора.
 *
 * Собирается так, чтобы гарантированно проходить серверную политику
 * (Atria.Application.Common.PasswordPolicy): заглавная, строчная, цифра и спецсимвол, длина 14.
 * Берём crypto.getRandomValues, а не Math.random: это пароль, который какое-то время открывает
 * доступ в панель, и предсказуемый генератор здесь стоит ровно столько же, сколько отсутствие пароля.
 *
 * Похожие символы (0/O, 1/l/I) исключены — пароль диктуют и переписывают руками.
 */
export function generateOneTimePassword(length = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?-+';
  const all = upper + lower + digits + symbols;

  const pick = (alphabet) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return alphabet[buf[0] % alphabet.length];
  };

  // По одному символу каждого класса, остальное — из общего алфавита.
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));

  // Перемешиваем, иначе первые четыре позиции всегда одного и того же класса.
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Скопировать текст в буфер обмена. Возвращает true, если получилось.
 *
 * navigator.clipboard существует только в защищённом контексте: панель, открытая по http на
 * локальном адресе (http://192.168.0.115:3000), его не получает, и вызов падал молча — кнопка
 * «скопировать» просто ничего не делала. Поэтому здесь есть запасной путь через временную
 * textarea и document.execCommand('copy'): он устарел, но работает и без https.
 */
export async function copyToClipboard(text) {
  const value = String(text ?? '');
  if (!value) return false;

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Разрешение не выдано или контекст всё-таки не тот — пробуем запасной путь ниже.
    }
  }

  try {
    const area = document.createElement('textarea');
    area.value = value;
    // Вне экрана, но в документе: невидимый через display:none элемент выделить нельзя.
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

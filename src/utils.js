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
 * Formats a USD amount to the target currency based on specified exchange rates.
 * 1 USD = 0.92 EUR
 * 1 USD = 87.0 KGS
 */
export function formatVal(usdValue, currency = 'KGS', includeFraction = false) {
  const rates = {
    USD: { rate: 1, symbol: '$', suffix: false },
    EUR: { rate: 0.92, symbol: '€', suffix: false },
    KGS: { rate: 87.0, symbol: ' с', suffix: true }
  };
  
  const config = rates[currency] || rates.USD;
  const converted = usdValue * config.rate;
  
  let formattedValue;
  if (includeFraction) {
    formattedValue = converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    if (converted < 1000 && converted % 1 !== 0) {
      formattedValue = converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formattedValue = Math.round(converted).toLocaleString('en-US');
    }
  }

  if (config.suffix) {
    return `${formattedValue}${config.symbol}`;
  } else {
    return `${config.symbol}${formattedValue}`;
  }
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

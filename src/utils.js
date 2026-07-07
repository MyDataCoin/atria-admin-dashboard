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

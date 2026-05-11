/**
 * Exchange rate structure matching the database.
 */
export interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
}

/**
 * Converts an amount from a target currency to the base currency.
 * Supports a simplified (amount, rate) call or a full (amount, from, base, rates) conversion.
 * 
 * @param amount - The amount to convert
 * @param fromCurrencyOrRate - The source currency code OR the conversion rate
 * @param baseCurrency - The target base currency code (optional if rate is provided)
 * @param rates - List of available exchange rates (optional if rate is provided)
 * @returns The converted amount in base currency
 */
export function convertToBase(
  amount: number,
  fromCurrencyOrRate: string | number,
  baseCurrency?: string,
  rates?: ExchangeRate[]
): number {
  const val = Number(amount) || 0;

  // Simple (amount, rate) usage
  if (typeof fromCurrencyOrRate === 'number') {
    return fromCurrencyOrRate > 0 ? val / fromCurrencyOrRate : 0;
  }

  const fromCurrency = fromCurrencyOrRate;
  if (!baseCurrency || !rates || fromCurrency === baseCurrency) return val;

  // 1. Direct rate
  const direct = rates.find(r => r.base === baseCurrency && r.target === fromCurrency);
  if (direct) return val / direct.rate;

  // 2. Inverse rate
  const inverse = rates.find(r => r.base === fromCurrency && r.target === baseCurrency);
  if (inverse) return val * inverse.rate;

  // 3. Triangulation via USD
  if (baseCurrency !== 'USD' && fromCurrency !== 'USD') {
    const toUsd = rates.find(r => r.base === 'USD' && r.target === fromCurrency);
    const fromUsd = rates.find(r => r.base === 'USD' && r.target === baseCurrency);
    if (toUsd && fromUsd) {
      return (val / toUsd.rate) * fromUsd.rate;
    }
  }

  return val;
}

/**
 * Formats a number as a currency string.
 * 
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., 'PHP', 'USD', 'SGD')
 * @param locale - Optional locale (defaults to 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

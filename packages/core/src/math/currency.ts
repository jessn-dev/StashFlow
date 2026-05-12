/**
 * Represents an exchange rate between two currencies.
 */
export interface ExchangeRate {
  /** The currency code used as the denominator (e.g., 'USD') */
  base: string;
  /** The currency code used as the numerator (e.g., 'PHP') */
  target: string;
  /** The exchange rate such that base * rate = target */
  rate: number;
}

/**
 * Converts a financial amount from a source currency to a target base currency.
 * 
 * This function supports three lookup strategies:
 * 1. Direct rate: base -> target
 * 2. Inverse rate: target -> base
 * 3. Triangulation: source -> USD -> base
 * 
 * @param amount - The numerical amount to be converted.
 * @param fromCurrencyOrRate - The source currency code (e.g., 'PHP') OR a pre-calculated rate.
 * @param baseCurrency - The target currency code (e.g., 'USD'). Required for complex lookups.
 * @param rates - An array of available ExchangeRate objects. Required for complex lookups.
 * @returns The converted amount in the base currency. Returns 0 if input is invalid.
 */
export function convertToBase(
  amount: number,
  fromCurrencyOrRate: string | number,
  baseCurrency?: string,
  rates?: ExchangeRate[]
): number {
  // PSEUDOCODE: Currency Conversion Logic
  // 1. Sanitize the input amount (default to 0 if NaN).
  // 2. If a raw rate (number) is provided instead of a currency code, divide amount by rate.
  // 3. If from and base currencies are identical, return the original amount.
  // 4. Attempt Direct Lookup: Does base -> from exist in the rates table?
  // 5. Attempt Inverse Lookup: Does from -> base exist in the rates table?
  // 6. Attempt Triangulation: Can we convert both to USD and then find the relative rate?
  // 7. Fallback: Return original amount if no rate can be determined.

  const value = Number(amount) || 0;

  // Simple (amount, rate) usage where the rate is already known by the caller.
  if (typeof fromCurrencyOrRate === 'number') {
    return fromCurrencyOrRate > 0 ? value / fromCurrencyOrRate : 0;
  }

  const fromCurrency = fromCurrencyOrRate;
  if (!baseCurrency || !rates || fromCurrency === baseCurrency) return value;

  // 1. Direct rate lookup: We have exactly what we need (e.g., Base: USD, Target: PHP).
  const directRate = rates.find(r => r.base === baseCurrency && r.target === fromCurrency);
  if (directRate) return value / directRate.rate;

  // 2. Inverse rate lookup: We have the reverse rate (e.g., Base: PHP, Target: USD).
  const inverseRate = rates.find(r => r.base === fromCurrency && r.target === baseCurrency);
  if (inverseRate) return value * inverseRate.rate;

  // 3. Triangulation via USD: Used for cross-rates (e.g., converting PHP to SGD when only USD pairs exist).
  // Formula: (Amount / PHP_per_USD) * SGD_per_USD
  if (baseCurrency !== 'USD' && fromCurrency !== 'USD') {
    const sourceToUsd = rates.find(r => r.base === 'USD' && r.target === fromCurrency);
    const baseToUsd = rates.find(r => r.base === 'USD' && r.target === baseCurrency);
    
    if (sourceToUsd && baseToUsd) {
      return (value / sourceToUsd.rate) * baseToUsd.rate;
    }
  }

  return value;
}

/**
 * Formats a numerical value as a localized currency string.
 * 
 * @param amount - The numerical value to format.
 * @param currency - The ISO currency code (e.g., 'PHP', 'USD', 'JPY').
 * @param locale - The BCP 47 language tag for formatting. Defaults to 'en-US'.
 * @returns A formatted string including the currency symbol (e.g., "$1,234.56").
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string {
  // We use Intl.NumberFormat as it is the standard browser/Node API for i18n currency formatting.
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}


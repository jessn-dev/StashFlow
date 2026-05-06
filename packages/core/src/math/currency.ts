/**
 * Converts an amount from a target currency to the base currency.
 * Formula: amount / rate
 * 
 * @param amount - The amount in the target currency
 * @param rate - The exchange rate (1 Base = X Target)
 * @returns The amount in base currency
 */
export function convertToBase(amount: number, rate: number): number {
  if (rate <= 0) return 0;
  return amount / rate;
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

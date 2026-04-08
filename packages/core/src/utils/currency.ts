/**
 * Formats a number as a currency string.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Converts an amount from one currency to another using a given rate.
 */
export function convertAmount(
  amount: number,
  rate: number // Rate from base to target
): number {
  return Number((amount * rate).toFixed(2))
}

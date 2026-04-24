import { RateMap } from '../schema'

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

/**
 * Converts an amount from any currency to the target base currency using a RateMap.
 */
export function convertToBase(
  amount: number,
  from: string,
  to: string,
  rates: RateMap
): number {
  const val = Number(amount) || 0
  if (from === to) return val
  
  // Try direct rate: base_target
  const rate = rates[`${to}_${from}`]
  if (rate) return val / rate

  // Try inverse rate: target_base
  const inverse = rates[`${from}_${to}`]
  if (inverse) return val * inverse

  // Fallback to USD triangulation if available
  if (to !== 'USD' && from !== 'USD') {
    const toUsd = rates[`USD_${from}`]
    const fromUsd = rates[`USD_${to}`]
    if (toUsd && fromUsd) {
      return (val / toUsd) * fromUsd
    }
  }

  return val
}

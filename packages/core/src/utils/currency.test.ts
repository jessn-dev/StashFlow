import { describe, it, expect } from 'vitest'
import { formatCurrency, convertAmount } from './currency'

describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    // Note: Intl.NumberFormat might use non-breaking space depending on environment
    // We replace non-breaking space with regular space for easier comparison if needed, 
    // but usually exact match works if we are careful.
    const result = formatCurrency(1234.56, 'USD', 'en-US')
    expect(result).toMatch(/\$1,234.56/)
  })

  it('should format EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR', 'de-DE')
    // German uses dot as thousand separator and comma as decimal separator
    // Result might be "1.234,56 €"
    expect(result).toMatch(/1\.234,56\s*€/)
  })

  it('should default to USD and en-US', () => {
    const result = formatCurrency(100)
    expect(result).toMatch(/\$100.00/)
  })
})

describe('convertAmount', () => {
  it('should convert amount correctly with rate', () => {
    expect(convertAmount(100, 1.2)).toBe(120)
    expect(convertAmount(100, 0.85)).toBe(85)
  })

  it('should round to 2 decimal places', () => {
    // 100 * 0.333333 = 33.3333... should be 33.33
    expect(convertAmount(100, 0.333333)).toBe(33.33)
  })
})

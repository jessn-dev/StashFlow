import { describe, it, expect } from 'vitest'
import { formatCurrency, convertAmount } from './currency'

describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD', 'en-US')
    // Standardize spaces to handle non-breaking space used by some Intl implementations
    expect(result.replace(/\u00a0/g, ' ')).toMatch(/\$1,234.56/)
  })

  it('should format EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR', 'de-DE')
    expect(result.replace(/\u00a0/g, ' ')).toMatch(/1\.234,56\s*€/)
  })

  it('should default to USD and en-US', () => {
    const result = formatCurrency(100)
    expect(result.replace(/\u00a0/g, ' ')).toMatch(/\$100.00/)
  })
})

describe('convertAmount', () => {
  it('should convert amount correctly with rate', () => {
    expect(convertAmount(100, 1.2)).toBe(120)
    expect(convertAmount(100, 0.85)).toBe(85)
  })

  it('should round to 2 decimal places', () => {
    expect(convertAmount(100, 0.333333)).toBe(33.33)
  })
})

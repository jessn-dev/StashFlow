import { describe, it, expect } from 'vitest'
import { formatCurrency, convertAmount, convertToBase } from './currency'

describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toContain('$1,234.56')
  })
})

describe('convertToBase', () => {
  const rates = {
    'USD_PHP': 56,
    'USD_EUR': 0.92,
    'EUR_GBP': 0.85
  }

  it('handles same currency conversion', () => {
    expect(convertToBase(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('handles direct rate conversion (base_target)', () => {
    // to: USD, from: PHP. rates[USD_PHP] = 56. 100 / 56 = 1.7857...
    expect(convertToBase(56, 'PHP', 'USD', rates)).toBe(1)
  })

  it('handles inverse rate conversion (target_base)', () => {
    // to: EUR, from: USD. inverse = rates[USD_EUR] = 0.92. 100 * 0.92 = 92
    expect(convertToBase(100, 'USD', 'EUR', rates)).toBe(92)
  })

  it('handles USD triangulation', () => {
    // to: EUR, from: PHP. 
    // val / USD_PHP * USD_EUR = 56 / 56 * 0.92 = 0.92
    expect(convertToBase(56, 'PHP', 'EUR', rates)).toBe(0.92)
  })

  it('falls back to input amount if no rate found', () => {
    expect(convertToBase(100, 'XYZ', 'ABC', {})).toBe(100)
  })
})

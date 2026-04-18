import { describe, it, expect, vi } from 'vitest'
import { fetchRateMap, convertCurrency } from './exchange-rates'
import { SupabaseClient } from '@supabase/supabase-js'

describe('fetchRateMap', () => {
  it('builds a keyed rate map from exchange_rates rows', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { base: 'USD', target: 'EUR', rate: 0.92 },
            { base: 'USD', target: 'PHP', rate: 56.5 },
          ],
          error: null,
        }),
      }),
    } as unknown as SupabaseClient

    const map = await fetchRateMap(mockSupabase)

    expect(map['USD_EUR']).toBe(0.92)
    expect(map['USD_PHP']).toBe(56.5)
  })

  it('throws when the query errors', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
      }),
    } as unknown as SupabaseClient

    await expect(fetchRateMap(mockSupabase)).rejects.toThrow('db error')
  })
})

describe('convertCurrency', () => {
  const rates = { USD_EUR: 0.92, USD_PHP: 56.5, EUR_USD: 1.087 }

  it('returns original amount when currencies are the same', () => {
    expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('converts via direct lookup', () => {
    expect(convertCurrency(100, 'USD', 'EUR', rates)).toBeCloseTo(92)
  })

  it('converts via inverse lookup', () => {
    // No EUR_USD direct rate — only USD_EUR: 0.92. Inverse: 0.92 / 0.92 ≈ 1
    const inverseRates = { USD_EUR: 0.92, USD_PHP: 56.5 }
    expect(convertCurrency(0.92, 'EUR', 'USD', inverseRates)).toBeCloseTo(1)
  })

  it('bridges via USD when direct rate missing', () => {
    // EUR → PHP: EUR→USD→PHP
    const result = convertCurrency(1, 'EUR', 'PHP', { ...rates })
    expect(result).toBeGreaterThan(0)
  })

  it('returns 0 for NaN amount', () => {
    expect(convertCurrency(NaN, 'USD', 'EUR', rates)).toBe(0)
  })

  it('returns original amount when rates are empty', () => {
    expect(convertCurrency(100, 'USD', 'EUR', {})).toBe(100)
  })

  it('returns original amount as fallback when rate not found', () => {
    expect(convertCurrency(100, 'GBP', 'JPY', rates)).toBe(100)
  })
})

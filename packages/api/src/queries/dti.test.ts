import { describe, it, expect, vi } from 'vitest'
import { getDTIRatio } from './dti'
import { SupabaseClient } from '@supabase/supabase-js'

describe('getDTIRatio', () => {
  it('calculates DTI from incomes and active loans', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incomes') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ amount: 5000, frequency: 'monthly' }],
              error: null,
            }),
          }
        }
        // loans
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ installment_amount: 1000, currency: 'USD' }],
              error: null,
            }),
          }),
        }
      }),
    } as unknown as SupabaseClient

    const result = await getDTIRatio(supabase)

    expect(result.ratio).toBe(20)
    expect(result.status).toBe('low')
    expect(result.gross_income).toBe(5000)
    expect(result.total_debt).toBe(1000)
    expect(result.currency).toBe('USD')
  })

  it('normalizes non-monthly income frequencies', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incomes') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { amount: 1000, frequency: 'weekly' },
                { amount: 2000, frequency: 'biweekly' },
                { amount: 12000, frequency: 'yearly' },
                { amount: 12000, frequency: 'one-time' },
              ],
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }),
    } as unknown as SupabaseClient

    const result = await getDTIRatio(supabase)
    // weekly 1000*4.33 + biweekly 2000*2.17 + yearly 12000/12 + one-time 12000/12
    const expected = 1000 * 4.33 + 2000 * 2.17 + 1000 + 1000
    expect(result.gross_income).toBeCloseTo(expected, 1)
    expect(result.ratio).toBe(0)
  })

  it('returns zero-risk result when there are no incomes and no loans', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incomes') {
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }),
    } as unknown as SupabaseClient

    const result = await getDTIRatio(supabase)
    expect(result.ratio).toBe(0)
    expect(result.status).toBe('low')
  })

  it('returns medium status when DTI is between 37-49%', async () => {
    // 1200 / 3000 = 40% → medium
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incomes') {
          return { select: vi.fn().mockResolvedValue({ data: [{ amount: 3000, frequency: 'monthly' }], error: null }) }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ installment_amount: 1200, currency: 'USD' }], error: null }),
          }),
        }
      }),
    } as unknown as SupabaseClient

    const result = await getDTIRatio(supabase)
    expect(result.status).toBe('medium')
    expect(result.recommendation).toContain('paying down debt')
  })

  it('returns high status when DTI is >= 50%', async () => {
    // 1200 / 2000 = 60% → high
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incomes') {
          return { select: vi.fn().mockResolvedValue({ data: [{ amount: 2000, frequency: 'monthly' }], error: null }) }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ installment_amount: 1200, currency: 'USD' }], error: null }),
          }),
        }
      }),
    } as unknown as SupabaseClient

    const result = await getDTIRatio(supabase)
    expect(result.status).toBe('high')
    expect(result.recommendation).toContain('Prioritise')
  })
})

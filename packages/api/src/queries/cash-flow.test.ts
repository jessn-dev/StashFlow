import { describe, it, expect, vi } from 'vitest'
import { getCashFlowProjections } from './cash-flow'
import { SupabaseClient } from '@supabase/supabase-js'

describe('getCashFlowProjections', () => {
  function makeSupabase(data: { incomes?: any[]; loans?: any[]; expenses?: any[] } = {}) {
    return {
      from: vi.fn().mockImplementation((table: string) => {
        const mockData = table === 'incomes'
          ? data.incomes ?? []
          : table === 'loans'
            ? data.loans ?? []
            : data.expenses ?? []

        const chain: any = {}
        const self = (..._: any[]) => chain
        ;['select', 'eq', 'gte', 'order', 'limit'].forEach(m => { chain[m] = self })
        chain.then = (res: any, rej?: any) =>
          Promise.resolve({ data: mockData, error: null }).then(res, rej)
        return chain
      }),
    } as unknown as SupabaseClient
  }

  it('returns 12 monthly projections', async () => {
    const result = await getCashFlowProjections(makeSupabase({
      incomes: [{ amount: 5000, frequency: 'monthly', currency: 'USD' }],
      loans:   [{ installment_amount: 800, currency: 'USD', end_date: null }],
      expenses: [{ amount: 1200 }, { amount: 1300 }, { amount: 1100 }],
    }))

    expect(result.projections).toHaveLength(12)
    expect(result.currency).toBe('USD')
    result.projections.forEach(p => {
      expect(p.income).toBe(5000)
      expect(p.debt).toBe(800)
      expect(typeof p.net).toBe('number')
    })
  })

  it('normalizes non-monthly income frequencies in projections', async () => {
    const result = await getCashFlowProjections(makeSupabase({
      incomes: [
        { amount: 1000, frequency: 'weekly',   currency: 'USD' },
        { amount: 2000, frequency: 'biweekly', currency: 'USD' },
        { amount: 12000, frequency: 'yearly',  currency: 'USD' },
        { amount: 12000, frequency: 'one-time', currency: 'USD' },
      ],
    }))

    expect(result.projections).toHaveLength(12)
    const expected = Math.round(1000 * 4.33 + 2000 * 2.17 + 1000 + 1000)
    result.projections.forEach(p => {
      expect(p.income).toBe(expected)
    })
  })

  it('returns 12 projections with zeros for empty data', async () => {
    const result = await getCashFlowProjections(makeSupabase())

    expect(result.projections).toHaveLength(12)
    expect(result.projections[0].income).toBe(0)
    expect(result.projections[0].debt).toBe(0)
  })

  it('excludes loans that end before a projected month', async () => {
    const past = '2026-01-01' // already ended
    const result = await getCashFlowProjections(makeSupabase({
      incomes: [{ amount: 3000, frequency: 'monthly', currency: 'USD' }],
      loans:   [{ installment_amount: 500, currency: 'USD', end_date: past }],
    }))

    // All months after the end date should have 0 debt
    result.projections.forEach(p => {
      expect(p.debt).toBe(0)
    })
  })
})

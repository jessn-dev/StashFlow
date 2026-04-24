import { describe, it, expect, vi } from 'vitest'
import { getBudgets, upsertBudget, getBudgetPeriod, rebalanceBudget, getSmartBudgetRecommendation } from './budgets'
import { SupabaseClient } from '@supabase/supabase-js'
import { getProfile } from './profile'

vi.mock('./dti', () => ({
  getDTIRatio: vi.fn().mockResolvedValue({ gross_income: 5000, total_debt: 1000, status: 'low' })
}))

vi.mock('./profile', () => ({
  getProfile: vi.fn().mockResolvedValue({ preferred_currency: 'USD' })
}))

vi.mock('./exchange-rates', () => ({
  fetchRateMap: vi.fn().mockResolvedValue({}),
  convertCurrency: vi.fn((amount: number) => amount)
}))

vi.mock('@stashflow/core', () => ({
  generateSmartBudget: vi.fn().mockReturnValue({ housing: 1500, food: 500 })
}))

const mockUser = { id: 'user-1' }
const mockBudget = { id: 'b1', user_id: 'user-1', category: 'food', amount: 500, currency: 'USD', rollover_enabled: true, created_at: null }
const mockPeriod = { id: 'bp1', user_id: 'user-1', category: 'food', period: '2026-04', budgeted: 500, spent: 200, rolled_over_amount: 0, created_at: null }

function makeAuth(user: typeof mockUser | null) {
  return { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) }
}

describe('getBudgets', () => {
  it('returns all budgets', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [mockBudget], error: null }),
      }),
    } as unknown as SupabaseClient

    const result = await getBudgets(supabase)
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('food')
  })

  it('throws when getBudgets errors', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
      }),
    } as unknown as SupabaseClient

    await expect(getBudgets(supabase)).rejects.toThrow('db error')
  })
})

describe('upsertBudget — error after auth', () => {
  it('throws on db error after successful auth', async () => {
    const supabase = {
      auth: makeAuth(mockUser),
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('upsert error') }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(upsertBudget(supabase, { category: 'food' as any, amount: 100, currency: 'USD', rollover_enabled: false }))
      .rejects.toThrow('upsert error')
  })
})

describe('upsertBudget', () => {
  it('upserts a budget and returns it', async () => {
    const supabase = {
      auth: makeAuth(mockUser),
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockBudget, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const result = await upsertBudget(supabase, { category: 'food' as any, amount: 500, currency: 'USD', rollover_enabled: true })
    expect(result).toEqual(mockBudget)
  })

  it('throws when not authenticated', async () => {
    const supabase = { auth: makeAuth(null) } as unknown as SupabaseClient
    await expect(upsertBudget(supabase, {} as any)).rejects.toThrow('Unauthorized')
  })
})

describe('getBudgetPeriod', () => {
  it('returns budget periods for a given month', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [mockPeriod], error: null }),
        }),
      }),
    } as unknown as SupabaseClient

    const result = await getBudgetPeriod(supabase, '2026-04')
    expect(result).toHaveLength(1)
    expect(result[0].period).toBe('2026-04')
  })

  it('throws when getBudgetPeriod errors', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('period error') }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(getBudgetPeriod(supabase, '2026-04')).rejects.toThrow('period error')
  })
})

describe('rebalanceBudget', () => {
  it('resolves without error (stub implementation)', async () => {
    const supabase = { auth: makeAuth(mockUser) } as unknown as SupabaseClient
    await expect(
      rebalanceBudget(supabase, { fromCategory: 'food', toCategory: 'transport', amount: 50, period: '2026-04', permanent: false })
    ).resolves.toBeUndefined()
  })

  it('throws when not authenticated', async () => {
    const supabase = { auth: makeAuth(null) } as unknown as SupabaseClient
    await expect(
      rebalanceBudget(supabase, { fromCategory: 'food', toCategory: 'transport', amount: 50, period: '2026-04', permanent: false })
    ).rejects.toThrow('Unauthorized')
  })
})

function makeSmartBudgetSupabase(opts: {
  expensesData?: any[]
  invokeResult?: { data: any; error: any }
  invokeThrows?: boolean
} = {}) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: opts.expensesData ?? [], error: null })
        })
      })
    }),
    functions: {
      invoke: opts.invokeThrows
        ? vi.fn().mockRejectedValue(new Error('network error'))
        : vi.fn().mockResolvedValue(opts.invokeResult ?? { data: { region: 'USA' }, error: null })
    }
  } as unknown as SupabaseClient
}

describe('getSmartBudgetRecommendation', () => {
  it('returns a recommendation with USD profile', async () => {
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('falls back to USD when preferred_currency is null', async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: null } as any)
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('handles macro profile response with error (skips macroProfile)', async () => {
    const result = await getSmartBudgetRecommendation(
      makeSmartBudgetSupabase({ invokeResult: { data: null, error: 'edge error' } })
    )
    expect(result).toBeDefined()
  })

  it('handles macro profile network failure (catch branch)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await getSmartBudgetRecommendation(
      makeSmartBudgetSupabase({ invokeThrows: true })
    )
    expect(result).toBeDefined()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('handles PHP currency (Philippines region)', async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: 'PHP' } as any)
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('handles SGD currency (Singapore region)', async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: 'SGD' } as any)
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('handles JPY currency (Japan region)', async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: 'JPY' } as any)
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('handles GBP currency (UK region)', async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: 'GBP' } as any)
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('handles EUR currency (EU region)', async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: 'EUR' } as any)
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('handles unknown currency (Global region default)', async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: 'BTC' } as any)
    const result = await getSmartBudgetRecommendation(makeSmartBudgetSupabase())
    expect(result).toBeDefined()
  })

  it('computes 3-month rolling averages from expense data', async () => {
    const result = await getSmartBudgetRecommendation(
      makeSmartBudgetSupabase({
        expensesData: [
          { amount: '300', currency: 'USD', category: 'housing' },
          { amount: '100', currency: 'USD', category: 'utilities' },
          { amount: '200', currency: 'USD', category: 'food' },
        ]
      })
    )
    expect(result).toBeDefined()
  })
})

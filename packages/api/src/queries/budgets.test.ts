import { describe, it, expect, vi } from 'vitest'
import { getBudgets, upsertBudget, getBudgetPeriod, rebalanceBudget } from './budgets'
import { SupabaseClient } from '@supabase/supabase-js'

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

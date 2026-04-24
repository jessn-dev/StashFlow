import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getExpenses, createExpense, deleteExpense, getExpensesByCategory, detectSubscriptions } from './expenses'
import { SupabaseClient } from '@supabase/supabase-js'
import { getProfile } from './profile'

vi.mock('./profile', () => ({
  getProfile: vi.fn().mockResolvedValue({ preferred_currency: 'USD' }),
}))

vi.mock('./exchange-rates', () => ({
  fetchRateMap: vi.fn().mockResolvedValue({}),
  convertCurrency: vi.fn((amount: number) => amount),
}))

describe('expenses queries', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
  } as unknown as SupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getExpenses', () => {
    it('should fetch expenses ordered by date descending', async () => {
      const mockData = [{ id: '1', amount: 100, date: '2026-04-01' }]
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null })
        })
      } as any)

      const result = await getExpenses(mockSupabase)
      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('expenses')
    })

    it('should throw error when Supabase returns an error', async () => {
      const mockError = { message: 'Database error' }
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: mockError })
        })
      } as any)

      await expect(getExpenses(mockSupabase)).rejects.toEqual(mockError)
    })

    it('should return empty array when no data is found', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      } as any)

      const result = await getExpenses(mockSupabase)
      expect(result).toEqual([])
    })
  })

  describe('createExpense', () => {
    it('should insert a new expense and return it', async () => {
      const newExpense = { amount: 50, category: 'food' } as any
      const mockResult = { id: '123', ...newExpense }
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockResult, error: null })
          })
        })
      } as any)

      const result = await createExpense(mockSupabase, newExpense)
      expect(result).toEqual(mockResult)
    })

    it('should throw error when insert fails', async () => {
      const mockError = { message: 'Insert failed' }
      vi.mocked(mockSupabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      } as any)

      await expect(createExpense(mockSupabase, {} as any)).rejects.toEqual(mockError)
    })
  })

  describe('deleteExpense', () => {
    it('should delete an expense by id', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any)

      const result = await deleteExpense(mockSupabase, '123')
      expect(result).toBe(true)
    })

    it('should throw error when delete fails', async () => {
      const mockError = { message: 'Delete failed' }
      vi.mocked(mockSupabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: mockError })
        })
      } as any)

      await expect(deleteExpense(mockSupabase, '123')).rejects.toEqual(mockError)
    })
  })

  describe('getExpensesByCategory', () => {
    it('should group and sum expenses by category', async () => {
      const mockData = [
        { category: 'food', amount: 10, currency: 'USD' },
        { category: 'food', amount: 20, currency: 'USD' },
        { category: 'transport', amount: 50, currency: 'USD' },
      ]

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      } as any)

      const result = await getExpensesByCategory(mockSupabase)

      expect(result).toContainEqual({ category: 'food', amount: 30 })
      expect(result).toContainEqual({ category: 'transport', amount: 50 })
      expect(result.length).toBe(2)
    })

    it('should throw error if fetching expenses fails', async () => {
        const mockError = { message: 'Fetch failed' }
        vi.mocked(mockSupabase.from).mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: mockError })
        } as any)

        await expect(getExpensesByCategory(mockSupabase)).rejects.toEqual(mockError)
    })

    it('should fall back to USD when preferred_currency is null', async () => {
      vi.mocked(getProfile).mockResolvedValueOnce({ preferred_currency: null } as any)
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ category: 'food', amount: 10, currency: 'USD' }], error: null })
      } as any)

      const result = await getExpensesByCategory(mockSupabase)
      expect(result).toContainEqual({ category: 'food', amount: 10 })
    })
  })
})

describe('detectSubscriptions', () => {
  it('filters out non-expense type transactions', () => {
    const result = detectSubscriptions([
      { type: 'income', description: 'Netflix', amount: 15, currency: 'USD', category: 'entertainment', date: '2026-01-01' },
    ])
    expect(result).toHaveLength(0)
  })

  it('skips entries with only one occurrence', () => {
    const result = detectSubscriptions([
      { type: 'expense', description: 'Netflix', amount: 15, currency: 'USD', category: 'entertainment', date: '2026-01-01' },
    ])
    expect(result).toHaveLength(0)
  })

  it('handles undefined description using "unknown" key', () => {
    const result = detectSubscriptions([
      { type: 'expense', description: undefined, amount: 10, currency: 'USD', category: 'food', date: '2026-01-01' },
      { type: 'expense', description: undefined, amount: 10, currency: 'USD', category: 'food', date: '2026-02-01' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(2)
  })

  it('skips when interval is too short (< 25 days)', () => {
    const result = detectSubscriptions([
      { type: 'expense', description: 'Gym', amount: 30, currency: 'USD', category: 'health', date: '2026-01-01' },
      { type: 'expense', description: 'Gym', amount: 30, currency: 'USD', category: 'health', date: '2026-01-10' },
    ])
    expect(result).toHaveLength(0)
  })

  it('skips when interval is too long (> 35 days)', () => {
    const result = detectSubscriptions([
      { type: 'expense', description: 'Magazine', amount: 10, currency: 'USD', category: 'entertainment', date: '2026-01-01' },
      { type: 'expense', description: 'Magazine', amount: 10, currency: 'USD', category: 'entertainment', date: '2026-03-01' },
    ])
    expect(result).toHaveLength(0)
  })

  it('detects a valid monthly subscription', () => {
    const result = detectSubscriptions([
      { type: 'expense', description: 'Netflix', amount: 15, currency: 'USD', category: 'entertainment', date: '2026-01-01' },
      { type: 'expense', description: 'Netflix', amount: 15, currency: 'USD', category: 'entertainment', date: '2026-02-01' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Netflix')
    expect(result[0].frequency).toBe('monthly')
    expect(result[0].count).toBe(2)
  })

  it('normalizes description to lowercase for grouping', () => {
    const result = detectSubscriptions([
      { type: 'expense', description: 'NETFLIX', amount: 15, currency: 'USD', category: 'entertainment', date: '2026-01-01' },
      { type: 'expense', description: 'netflix', amount: 15, currency: 'USD', category: 'entertainment', date: '2026-02-01' },
    ])
    expect(result).toHaveLength(1)
  })

  it('returns empty array when given no transactions', () => {
    expect(detectSubscriptions([])).toHaveLength(0)
  })
})

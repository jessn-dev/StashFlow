import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getExpenses, createExpense, deleteExpense, getExpensesByCategory } from './expenses'
import { SupabaseClient } from '@supabase/supabase-js'

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
  })

  describe('getExpensesByCategory', () => {
    it('should group and sum expenses by category', async () => {
      const mockData = [
        { category: 'food', amount: 10 },
        { category: 'food', amount: 20 },
        { category: 'transport', amount: 50 },
      ]
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      } as any)

      const result = await getExpensesByCategory(mockSupabase)
      
      expect(result).toContainEqual({ category: 'food', amount: 30 })
      expect(result).toContainEqual({ category: 'transport', amount: 50 })
      expect(result.length).toBe(2)
    })
  })
})

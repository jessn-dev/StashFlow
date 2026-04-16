import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getIncomes, createIncome, deleteIncome } from './income'
import { SupabaseClient } from '@supabase/supabase-js'

describe('income queries', () => {
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

  describe('getIncomes', () => {
    it('should fetch incomes ordered by date descending', async () => {
      const mockData = [{ id: '1', amount: 5000, date: '2026-04-01' }]
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null })
        })
      } as any)

      const result = await getIncomes(mockSupabase)
      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('incomes')
    })
  })

  describe('createIncome', () => {
    it('should insert a new income entry and return it', async () => {
      const newIncome = { amount: 1000, source: 'Bonus' } as any
      const mockResult = { id: '456', ...newIncome }
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockResult, error: null })
          })
        })
      } as any)

      const result = await createIncome(mockSupabase, newIncome)
      expect(result).toEqual(mockResult)
    })
  })

  describe('deleteIncome', () => {
    it('should delete an income entry by id', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any)

      const result = await deleteIncome(mockSupabase, '456')
      expect(result).toBe(true)
    })
  })
})

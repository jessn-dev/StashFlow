import { describe, it, expect, vi } from 'vitest'
import { getDashboardSummary, getRecentTransactions } from './dashboard'
import { SupabaseClient } from '@supabase/supabase-js'

describe('dashboard queries', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    limit: vi.fn(() => mockSupabase),
  } as unknown as SupabaseClient

  describe('getDashboardSummary', () => {
    it('should calculate summary correctly from incomes and active loans', async () => {
      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'incomes') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ amount: 1000 }, { amount: 2000 }],
              error: null
            })
          } as any
        }
        if (table === 'loans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ principal: 500 }],
                error: null
              })
            })
          } as any
        }
        return {} as any
      })

      const result = await getDashboardSummary(mockSupabase)

      expect(result.totalAssets).toBe(3000)
      expect(result.totalLiabilities).toBe(500)
      expect(result.netWorth).toBe(2500)
    })

    it('should handle empty data', async () => {
      // Re-mocking more cleanly
      const mFrom = vi.fn()
      const mSelect = vi.fn()
      const mEq = vi.fn()

      const cleanMock = { from: mFrom } as unknown as SupabaseClient
      
      mFrom.mockReturnValue({ select: mSelect })
      mSelect.mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null })
        // @ts-ignore
        p.eq = mEq
        mEq.mockResolvedValue({ data: [], error: null })
        return p
      })

      const result = await getDashboardSummary(cleanMock)
      expect(result.totalAssets).toBe(0)
      expect(result.totalLiabilities).toBe(0)
      expect(result.netWorth).toBe(0)
    })
  })

  describe('getRecentTransactions', () => {
    it('should merge and sort transactions correctly', async () => {
      const mFrom = vi.fn()
      const mSelect = vi.fn()
      const mOrder = vi.fn()
      const mLimit = vi.fn()

      const mock = { from: mFrom } as unknown as SupabaseClient

      mFrom.mockReturnValue({ select: mSelect })
      mSelect.mockReturnValue({ order: mOrder })
      mOrder.mockReturnValue({ limit: mLimit })

      // First call (incomes), Second call (expenses)
      mLimit
        .mockResolvedValueOnce({
          data: [{ id: 'i1', amount: 100, date: '2026-01-02', source: 'Job' }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ id: 'e1', amount: 50, date: '2026-01-01', category: 'Food' }],
          error: null
        })

      const result = await getRecentTransactions(mock)

      expect(result.length).toBe(2)
      expect(result[0].id).toBe('i1') // Newer first
      expect(result[1].id).toBe('e1')
      expect(result[0].type).toBe('income')
      expect(result[1].type).toBe('expense')
    })
  })
})

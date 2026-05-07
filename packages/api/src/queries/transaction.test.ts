import { describe, it, expect, vi } from 'vitest'
import { TransactionQuery } from './transaction'
import { SupabaseClient } from '@supabase/supabase-js'

const mockSummary = {
  totalIncome: 5000,
  totalExpenses: 3000,
  netFlow: 2000,
  currency: 'USD',
  count: 5
}

describe('TransactionQuery', () => {
  it('should fetch summary for a period', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'profiles') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { preferred_currency: 'USD' }, error: null }) }) }) }
        }
        if (table === 'exchange_rates') {
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
        }
        // incomes/expenses
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          })
        }
      })
    } as unknown as SupabaseClient

    const query = new TransactionQuery(supabase)
    const result = await query.getSummaryForPeriod('user-1', '2026-05-01', '2026-05-31')
    
    expect(result.currency).toBe('USD')
    expect(result.totalIncome).toBe(0) // Mock returned empty
  })
})

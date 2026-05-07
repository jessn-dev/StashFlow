import { describe, it, expect, vi } from 'vitest'
import { LoanQuery } from './loan'
import { SupabaseClient } from '@supabase/supabase-js'

const mockLoans = [
  { id: 'loan-1', name: 'Loan 1', user_id: 'user-1', principal: 1000, currency: 'USD' },
  { id: 'loan-2', name: 'Loan 2', user_id: 'user-1', principal: 2000, currency: 'PHP' },
]

const mockPayments = [
  { loan_id: 'loan-1', status: 'paid', due_date: '2026-05-01' },
  { loan_id: 'loan-1', status: 'pending', due_date: '2026-06-01' },
]

describe('LoanQuery', () => {
  it('should fetch all loans for a user', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockLoans, error: null }),
        }),
      }),
    } as unknown as SupabaseClient

    const query = new LoanQuery(supabase)
    const result = await query.getAll('user-1')
    expect(result).toHaveLength(2)
    expect(result[0]?.name).toBe('Loan 1')
  })

  it('should fetch a single loan by id', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockLoans[0], error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const query = new LoanQuery(supabase)
    const result = await query.getById('loan-1', 'user-1')
    expect(result?.id).toBe('loan-1')
  })

  it('should fetch payment summaries correctly', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
        }),
      }),
    } as unknown as SupabaseClient

    const query = new LoanQuery(supabase)
    const result = await query.getPaymentSummaries('user-1')
    
    expect(result).toHaveLength(1)
    expect(result[0]?.paidCount).toBe(1)
    expect(result[0]?.nextDueDate).toBe('2026-06-01')
  })
})

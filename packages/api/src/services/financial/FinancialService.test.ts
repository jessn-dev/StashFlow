import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FinancialService } from './FinancialService'
import { SupabaseClient } from '@supabase/supabase-js'

const mockUser = { id: 'u1' }

function mkChain(data: any) {
  const obj: any = {
    select: vi.fn(() => obj),
    insert: vi.fn(() => obj),
    delete: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    order: vi.fn(() => obj),
    limit: vi.fn(() => obj),
    single: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null })),
    then: (resolve: any) => resolve({ data: Array.isArray(data) ? data : [data], error: null })
  }
  return obj
}

describe('FinancialService', () => {
  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn()
  } as unknown as SupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch loans', async () => {
    vi.mocked(mockSupabase.from).mockReturnValue(mkChain([{ id: 'l1', name: 'Loan 1' }]))
    const service = new FinancialService(mockSupabase)
    const loans = await service.getLoans()
    expect(loans).toHaveLength(1)
    expect(loans[0].name).toBe('Loan 1')
  })

  it('should create a loan', async () => {
    const loanData = {
      name: 'New Loan',
      principal: 1000,
      interest_rate: 10,
      duration_months: 12,
      start_date: '2026-01-01',
      interest_type: 'Standard Amortized',
      interest_basis: '30/360'
    }
    vi.mocked(mockSupabase.from).mockReturnValue(mkChain([{ id: 'l2', ...loanData }]))
    
    const service = new FinancialService(mockSupabase)
    const loan = await service.createLoan(loanData)
    expect(loan.id).toBe('l2')
    expect(mockSupabase.from).toHaveBeenCalledWith('loans')
    expect(mockSupabase.from).toHaveBeenCalledWith('loan_payments')
  })

  it('should delete a loan', async () => {
    vi.mocked(mockSupabase.from).mockReturnValue(mkChain([]))
    const service = new FinancialService(mockSupabase)
    await service.deleteLoan('l1')
    expect(mockSupabase.from).toHaveBeenCalledWith('loans')
  })

  it('should create an expense', async () => {
    const expData = {
      amount: 100,
      currency: 'USD',
      category: 'food',
      date: '2026-01-01'
    }
    vi.mocked(mockSupabase.from).mockReturnValue(mkChain([{ id: 'e1', ...expData }]))
    const service = new FinancialService(mockSupabase)
    const exp = await service.createExpense(expData)
    expect(exp.id).toBe('e1')
    expect(mockSupabase.from).toHaveBeenCalledWith('expenses')
  })
})

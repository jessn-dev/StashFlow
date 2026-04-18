import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLoans, createLoan, deleteLoan, getLoanPayments, togglePaymentStatus } from './loans'
import { SupabaseClient } from '@supabase/supabase-js'

describe('loans queries', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    auth: {
      getUser: vi.fn(),
    },
  } as unknown as SupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null } as any)
  })

  describe('getLoans', () => {
    it('should fetch loans ordered by created_at descending', async () => {
      const mockData = [{ id: '1', name: 'Home Loan' }]
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null })
        })
      } as any)

      const result = await getLoans(mockSupabase)
      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('loans')
    })
  })

  describe('createLoan', () => {
    it('should insert a new loan and its generated payments', async () => {
      const loanData = {
        name: 'Car Loan',
        principal: 10000,
        currency: 'USD',
        interest_rate: 5,
        duration_months: 12,
        start_date: '2026-01-01'
      }
      
      const mockLoanResult = { id: 'loan-456', ...loanData }
      
      // Mock for Loan insert
      const loanInsertMock = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockLoanResult, error: null })
          })
        })
      }
      
      // Mock for Payments insert
      const paymentsInsertMock = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(loanInsertMock as any)
        .mockReturnValueOnce(paymentsInsertMock as any)

      const result = await createLoan(mockSupabase, loanData)
      
      expect(result).toEqual(mockLoanResult)
      expect(mockSupabase.from).toHaveBeenCalledWith('loans')
      expect(mockSupabase.from).toHaveBeenCalledWith('loan_payments')
      
      // Check if payments were generated (12 months)
      const paymentsCall = vi.mocked(paymentsInsertMock.insert).mock.calls[0][0] as any[]
      expect(paymentsCall.length).toBe(12)
      expect(paymentsCall[0].loan_id).toBe('loan-456')
    })
  })

  describe('deleteLoan', () => {
    it('should delete a loan by id', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any)

      await deleteLoan(mockSupabase, 'loan-456')
      expect(mockSupabase.from).toHaveBeenCalledWith('loans')
    })
  })

  describe('getLoanPayments', () => {
    it('should fetch payments for a specific loan', async () => {
      const mockData = [{ id: 'p1', loan_id: 'loan-123' }]
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockData, error: null })
          })
        })
      } as any)

      const result = await getLoanPayments(mockSupabase, 'loan-123')
      expect(result).toEqual(mockData)
    })
  })

  describe('togglePaymentStatus', () => {
    it('should toggle status from pending to paid and mark loan completed when all paid', async () => {
      const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      vi.mocked(mockSupabase.from)
        // 1) loan_payments.update.eq (status update)
        .mockReturnValueOnce({ update: updateFn } as any)
        // 2) loan_payments.select.eq.neq.limit (remaining unpaid check) → empty = all paid
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        } as any)
        // 3) loans.update.eq (mark loan completed)
        .mockReturnValueOnce({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) } as any)

      await togglePaymentStatus(mockSupabase, 'p1', 'pending', 'loan-123')

      const updateData = updateFn.mock.calls[0][0] as any
      expect(updateData.status).toBe('paid')
      expect(updateData.paid_date).toBeDefined()
    })

    it('should toggle status from paid to pending and restore loan to active', async () => {
      const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      vi.mocked(mockSupabase.from)
        // 1) loan_payments.update.eq
        .mockReturnValueOnce({ update: updateFn } as any)
        // 2) remaining check → has pending payments
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ id: 'p2' }], error: null }),
              }),
            }),
          }),
        } as any)
        // 3) loans.update.eq (mark loan active)
        .mockReturnValueOnce({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) } as any)

      await togglePaymentStatus(mockSupabase, 'p1', 'paid', 'loan-123')

      const updateData = updateFn.mock.calls[0][0] as any
      expect(updateData.status).toBe('pending')
      expect(updateData.paid_date).toBeNull()
    })
  })
})

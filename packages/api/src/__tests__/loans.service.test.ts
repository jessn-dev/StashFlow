import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoansService } from '../services/loans';
import type { ILoanQuery, IExchangeRateQuery, IProfileQuery, ITransactionQuery, PaymentSummary } from '../queries/interfaces';
import type { Loan, LoanPayment, Profile, Income, ExchangeRate } from '@stashflow/core';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile: Profile = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  preferred_currency: 'USD',
  budgeting_enabled: false,
  global_rollover_enabled: false,
  rollover_start_month: null,
  contingency_mode_active: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockLoan: Loan = {
  id: 'loan-1',
  user_id: 'user-1',
  name: 'Test Loan',
  principal: 10000,
  interest_rate: 12,
  installment_amount: 333.33,
  duration_months: 36,
  start_date: '2026-01-01',
  end_date: '2029-01-01',
  currency: 'USD',
  interest_type: 'Standard Amortized',
  interest_basis: '30/360',
  commercial_category: 'Personal / Cash',
  status: 'active',
  lender: null,
  inference_confidence: null,
  inference_source: null,
  source_document_id: null,
  completed_at: null,
  country_code: 'US',
  created_at: '2026-01-01T00:00:00Z',
  effective_interest_rate: null,
  payment_start_date: null,
};

const mockPayment: LoanPayment = {
  id: 'pay-1',
  loan_id: 'loan-1',
  user_id: 'user-1',
  amount_paid: 333.33,
  due_date: '2026-02-01',
  paid_date: null,
  status: 'pending',
  created_at: '2026-02-01T00:00:00Z',
};

const mockIncome: Income = {
  id: 'inc-1',
  user_id: 'user-1',
  amount: 5000,
  currency: 'USD',
  source: 'Salary',
  frequency: 'monthly',
  date: '2026-01-01',
  notes: null,
  signature: 'mock-sig',
  created_at: '2026-01-01T00:00:00Z',
};

const mockRates: ExchangeRate[] = [];

// ─── Mock factories ────────────────────────────────────────────────────────────

function makeLoanQuery(overrides?: Partial<ILoanQuery>): ILoanQuery {
  return {
    getAll: vi.fn().mockResolvedValue([mockLoan]),
    getById: vi.fn().mockResolvedValue(mockLoan),
    getPayments: vi.fn().mockResolvedValue([mockPayment]),
    getPaymentSummaries: vi.fn().mockResolvedValue([
      { loanId: 'loan-1', paidCount: 0, nextDueDate: '2026-02-01' } satisfies PaymentSummary,
    ]),
    ...overrides,
  };
}

function makeExchangeRateQuery(overrides?: Partial<IExchangeRateQuery>): IExchangeRateQuery {
  return {
    getLatest: vi.fn().mockResolvedValue(mockRates),
    ...overrides,
  };
}

function makeProfileQuery(overrides?: Partial<IProfileQuery>): IProfileQuery {
  return {
    get: vi.fn().mockResolvedValue(mockProfile),
    update: vi.fn().mockResolvedValue(mockProfile),
    ...overrides,
  };
}

function makeTransactionQuery(overrides?: Partial<ITransactionQuery>): ITransactionQuery {
  return {
    getIncomes: vi.fn().mockResolvedValue([mockIncome]),
    getExpenses: vi.fn().mockResolvedValue([]),
    getAllTransactions: vi.fn().mockResolvedValue([]),
    getTransactionSummary: vi.fn().mockResolvedValue({ totalIncome: 0, totalExpenses: 0, netFlow: 0, currency: 'USD' }),
    getTransactionsFiltered: vi.fn().mockResolvedValue([]),
    getSummaryForPeriod: vi.fn().mockResolvedValue({ totalIncome: 0, totalExpenses: 0, netFlow: 0, currency: 'USD', count: 0 }),
    getHistoricalSummaries: vi.fn().mockResolvedValue([]),
    getSpendingByCategory: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoansService.getLoansPageData', () => {
  it('returns aggregated loan data for a user with one active loan', async () => {
    const service = new LoansService(
      makeLoanQuery(),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');

    expect(result.loans).toHaveLength(1);
    expect(result.currency).toBe('USD');
    expect(result.activeLoanCount).toBe(1);
    expect(result.totalDebt).toBe(10000);
    expect(result.totalMonthlyInstallment).toBe(333.33);
  });

  it('uses preferred_currency from profile', async () => {
    const service = new LoansService(
      makeLoanQuery(),
      makeExchangeRateQuery(),
      makeProfileQuery({ get: vi.fn().mockResolvedValue({ ...mockProfile, preferred_currency: 'PHP' }) }),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');
    expect(result.currency).toBe('PHP');
  });

  it('falls back to USD when profile is null', async () => {
    const service = new LoansService(
      makeLoanQuery(),
      makeExchangeRateQuery(),
      makeProfileQuery({ get: vi.fn().mockResolvedValue(null) }),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');
    expect(result.currency).toBe('USD');
  });

  it('returns empty loan list when user has no loans', async () => {
    const service = new LoansService(
      makeLoanQuery({ getAll: vi.fn().mockResolvedValue([]) }),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');

    expect(result.loans).toHaveLength(0);
    expect(result.totalDebt).toBe(0);
    expect(result.activeLoanCount).toBe(0);
    expect(result.avgInterestRate).toBe(0);
  });

  it('sets remainingBalance to principal when paidCount is 0', async () => {
    const service = new LoansService(
      makeLoanQuery({
        getPaymentSummaries: vi.fn().mockResolvedValue([
          { loanId: 'loan-1', paidCount: 0, nextDueDate: null } satisfies PaymentSummary,
        ]),
      }),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');
    expect(result.loanMetrics['loan-1']?.remainingBalance).toBe(10000);
  });

  it('calculates paidPercent correctly', async () => {
    const service = new LoansService(
      makeLoanQuery({
        getPaymentSummaries: vi.fn().mockResolvedValue([
          { loanId: 'loan-1', paidCount: 18, nextDueDate: null } satisfies PaymentSummary,
        ]),
      }),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');
    // 18 / 36 months = 50%
    expect(result.loanMetrics['loan-1']?.paidPercent).toBe(50);
  });

  it('computes DTI as healthy when monthly debt is below threshold', async () => {
    // income: $5000/mo, installment: $333.33/mo → DTI ~6.7% — well below 36% US threshold
    const service = new LoansService(
      makeLoanQuery(),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');
    expect(result.dtiHealthy).toBe(true);
  });

  it('computes DTI as unhealthy when monthly debt exceeds threshold', async () => {
    const heavyLoan: Loan = { ...mockLoan, installment_amount: 3000 };
    const service = new LoansService(
      makeLoanQuery({ getAll: vi.fn().mockResolvedValue([heavyLoan]) }),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoansPageData('user-1');
    // $3000 / $5000 = 60% — exceeds 43% US hard limit
    expect(result.dtiHealthy).toBe(false);
  });

  it('handles zero income gracefully', async () => {
    const service = new LoansService(
      makeLoanQuery(),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery({ getIncomes: vi.fn().mockResolvedValue([]) }),
    );

    const result = await service.getLoansPageData('user-1');
    expect(result.dtiHealthy).toBe(false);
    expect(result.dtiRatio).toBe(1);
  });

  it('handles zero income and zero debt gracefully', async () => {
    const service = new LoansService(
      makeLoanQuery({ getAll: vi.fn().mockResolvedValue([]) }),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery({ getIncomes: vi.fn().mockResolvedValue([]) }),
    );

    const result = await service.getLoansPageData('user-1');
    expect(result.dtiHealthy).toBe(true);
    expect(result.dtiRatio).toBe(0);
  });
});

describe('LoansService.getLoanDetail', () => {
  it('returns loan and payments for a valid loan', async () => {
    const service = new LoansService(
      makeLoanQuery(),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoanDetail('loan-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result?.loan.id).toBe('loan-1');
    expect(result?.payments).toHaveLength(1);
  });

  it('returns null when loan does not exist', async () => {
    const service = new LoansService(
      makeLoanQuery({ getById: vi.fn().mockResolvedValue(null) }),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    const result = await service.getLoanDetail('nonexistent', 'user-1');
    expect(result).toBeNull();
  });

  it('does not fetch payments when loan is not found', async () => {
    const getPayments = vi.fn();
    const service = new LoansService(
      makeLoanQuery({ getById: vi.fn().mockResolvedValue(null), getPayments }),
      makeExchangeRateQuery(),
      makeProfileQuery(),
      makeTransactionQuery(),
    );

    await service.getLoanDetail('nonexistent', 'user-1');
    expect(getPayments).not.toHaveBeenCalled();
  });
});

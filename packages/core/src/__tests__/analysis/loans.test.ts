import { describe, it, expect } from 'vitest';
import { aggregateLoanFinancials } from '../../analysis/loans.ts';
import { Loan } from '../../schema/index.ts';

describe('loan analysis', () => {
  it('should aggregate loan financials correctly', () => {
    const loans: Partial<Loan>[] = [
      { principal: 10000, installment_amount: 500, currency: 'USD', status: 'active', interest_rate: 5 },
      { principal: 20000, installment_amount: 1000, currency: 'USD', status: 'active', interest_rate: 7 },
      { principal: 5000, installment_amount: 200, currency: 'PHP', status: 'active', interest_rate: 10 },
      { principal: 15000, installment_amount: 0, currency: 'USD', status: 'completed', interest_rate: 6 },
    ];

    const rates = { USD: 1, PHP: 50 }; // 1 USD = 50 PHP

    const result = aggregateLoanFinancials(loans as Loan[], rates);

    expect(result.totalDebt).toBe(10000 + 20000 + (5000 / 50) + 15000);
    expect(result.totalMonthlyInstallment).toBe(500 + 1000 + (200 / 50));
    expect(result.avgInterestRate).toBe((5 + 7 + 10) / 3);
    expect(result.activeLoanCount).toBe(3);
  });

  it('should handle empty loan list', () => {
    const result = aggregateLoanFinancials([], { USD: 1 });
    expect(result.totalDebt).toBe(0);
    expect(result.totalMonthlyInstallment).toBe(0);
    expect(result.avgInterestRate).toBe(0);
    expect(result.activeLoanCount).toBe(0);
  });

  it('should handle null status as active', () => {
    const loans: Partial<Loan>[] = [
      { principal: 1000, installment_amount: 100, currency: 'USD', status: null, interest_rate: 5 },
    ];
    const result = aggregateLoanFinancials(loans as Loan[], { USD: 1 });
    expect(result.activeLoanCount).toBe(1);
    expect(result.totalMonthlyInstallment).toBe(100);
  });

  it('should default to rate 1 if currency is missing', () => {
    const loans: Partial<Loan>[] = [
      { principal: 1000, installment_amount: 100, currency: 'UNKNOWN', status: 'active', interest_rate: 5 },
    ];
    const result = aggregateLoanFinancials(loans as Loan[], { USD: 1 });
    expect(result.totalDebt).toBe(1000);
    expect(result.totalMonthlyInstallment).toBe(100);
  });
});

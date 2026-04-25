import { describe, it, expect } from 'vitest';
import { aggregateDashboardData } from '../../analysis/dashboard';
import { Income, Expense, Loan } from '../../schema';

describe('dashboard analysis', () => {
  it('should aggregate data correctly', () => {
    const incomes: Partial<Income>[] = [
      { amount: 5000, currency: 'USD' }
    ];
    const expenses: Partial<Expense>[] = [
      { amount: 2000, currency: 'USD' }
    ];
    const loans: Partial<Loan>[] = [
      { principal: 10000, installment_amount: 500, currency: 'USD' }
    ];

    const result = aggregateDashboardData({
      incomes: incomes as Income[],
      expenses: expenses as Expense[],
      loans: loans as Loan[],
      goals: [],
      rates: { USD: 1 },
      region: 'US',
    });

    expect(result.monthlyCashFlow).toBe(3000);
    expect(result.totalLiabilities).toBe(10000);
    expect(result.dtiRatio).toBe(0.1); // 500 / 5000
    expect(result.dtiHealthy).toBe(true);
  });
});

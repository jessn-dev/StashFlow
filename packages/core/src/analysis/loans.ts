import { Loan } from '../schema/index.ts';
import { convertToBase } from '../math/currency.ts';

export interface LoanAggregates {
  totalDebt: number;
  totalMonthlyInstallment: number;
  avgInterestRate: number;
  activeLoanCount: number;
}

export function aggregateLoanFinancials(
  loans: Loan[],
  rates: Record<string, number>,
): LoanAggregates {
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === null);

  const totalDebt = loans.reduce(
    (acc, loan) => acc + convertToBase(loan.principal, rates[loan.currency] ?? 1),
    0,
  );

  const totalMonthlyInstallment = activeLoans.reduce(
    (acc, loan) => acc + convertToBase(loan.installment_amount, rates[loan.currency] ?? 1),
    0,
  );

  const avgInterestRate =
    activeLoans.length > 0
      ? activeLoans.reduce((acc, l) => acc + l.interest_rate, 0) / activeLoans.length
      : 0;

  return { totalDebt, totalMonthlyInstallment, avgInterestRate, activeLoanCount: activeLoans.length };
}

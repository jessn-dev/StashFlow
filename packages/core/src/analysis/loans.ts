import { Loan } from '../schema/mod.ts';
import { convertToBase } from '../math/currency.ts';

/**
 * Summarized financial metrics across a collection of loans.
 */
export interface LoanAggregates {
  /** Sum of all loan principals, normalized to base currency. */
  totalDebt: number;
  /** Sum of monthly installments for active loans, normalized to base currency. */
  totalMonthlyInstallment: number;
  /** Arithmetic mean of interest rates across active loans. */
  avgInterestRate: number;
  /** Total count of loans currently in 'active' status. */
  activeLoanCount: number;
}

/**
 * Aggregates financial metrics for a list of loans, handling currency normalization.
 * 
 * PSEUDOCODE:
 * 1. Filter the list for 'active' loans (status is 'active' or null).
 * 2. Calculate totalDebt by summing all principals after converting each to base currency.
 * 3. Calculate totalMonthlyInstallment by summing active loan installments after conversion.
 * 4. Calculate avgInterestRate by summing active loan rates and dividing by the active count.
 * 5. Return the aggregated metrics.
 * 
 * @param loans - Array of loan objects to aggregate.
 * @param rates - Map of currency codes to their base currency exchange rate.
 * @returns An object containing the aggregated loan metrics.
 */
export function aggregateLoanFinancials(
  loans: Loan[],
  rates: Record<string, number>,
): LoanAggregates {
  // We consider null status as active to account for legacy data or initialization states.
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

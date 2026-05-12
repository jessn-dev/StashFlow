import { Income, Expense, Loan, Asset, Goal, Region, DashboardPayload, ActivityItem } from '../schema/mod.ts';
import { calculateDTIRatio } from '../math/dti.ts';
import { convertToBase } from '../math/currency.ts';

/**
 * Aggregates raw financial data into a comprehensive dashboard payload.
 * Handles currency conversion to a base currency and calculates key performance indicators (KPIs).
 * 
 * PSEUDOCODE:
 * 1. Normalize all Incomes to the base currency and sum for totalMonthlyIncome.
 * 2. Normalize all Expenses to the base currency and sum for totalMonthlyExpenses.
 * 3. Normalize all Loan principals for totalLiabilities.
 * 4. Normalize all Loan installment amounts for monthlyDebtService.
 * 5. Normalize all Asset balances for totalAssets.
 * 6. Calculate DTI (Debt-to-Income) ratio using the summarized monthly debt and income.
 * 7. Merge Incomes and Expenses into a single activity list, sort by date descending, and take the top 5.
 * 8. Compute Net Worth (Assets - Liabilities) and Cash Flow (Income - Expenses).
 * 9. Construct and return the DashboardPayload.
 * 
 * @param params - Configuration object containing all raw financial records and regional context.
 * @returns A structured DashboardPayload for UI consumption.
 * @throws Error - May occur if currency conversion rates are missing for required currencies.
 */
export function aggregateDashboardData(params: {
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  assets: Asset[];
  goals: Goal[];
  rates: Record<string, number>; // Target to Base rate map
  region: Region;
  currency: string;
}): DashboardPayload {
  const { incomes, expenses, loans, assets, rates, region, currency } = params;

  // Reduce incomes to base currency using provided exchange rates.
  const totalMonthlyIncome = incomes.reduce((acc, inc) => {
    const rate = rates[inc.currency] || 1;
    return acc + convertToBase(inc.amount, rate);
  }, 0);

  const totalMonthlyExpenses = expenses.reduce((acc, exp) => {
    const rate = rates[exp.currency] || 1;
    return acc + convertToBase(exp.amount, rate);
  }, 0);

  const totalLiabilities = loans.reduce((acc, loan) => {
    const rate = rates[loan.currency] || 1;
    return acc + convertToBase(loan.principal, rate);
  }, 0);

  const monthlyDebtService = loans.reduce((acc, loan) => {
    const rate = rates[loan.currency] || 1;
    return acc + convertToBase(loan.installment_amount, rate);
  }, 0);

  // DTI calculation is a critical KPI for financial health assessment.
  const dtiResult = calculateDTIRatio(monthlyDebtService, totalMonthlyIncome, region);

  const totalAssets = assets.reduce((acc, asset) => {
    const rate = rates[asset.currency] || 1;
    return acc + convertToBase(asset.balance, rate);
  }, 0);

  // Compile recent activity from multiple sources for a unified timeline.
  const recentActivity: ActivityItem[] = [
    ...incomes.map(i => ({ type: 'income' as const, amount: i.amount, description: i.source, date: i.date })),
    ...expenses.map(e => ({ type: 'expense' as const, amount: e.amount, description: e.description, date: e.date }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 5);

  return {
    netWorth: totalAssets - totalLiabilities,
    monthlyCashFlow: totalMonthlyIncome - totalMonthlyExpenses,
    totalAssets,
    totalLiabilities,
    dtiRatio: dtiResult.ratio,
    dtiHealthy: dtiResult.isHealthy,
    currency,
    recentActivity,
  };
}

import { Income, Expense, Loan, Asset, Goal, Region, DashboardPayload, ActivityItem } from '../schema/index.ts';
import { calculateDTIRatio } from '../math/dti.ts';
import { convertToBase } from '../math/currency.ts';

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

  const dtiResult = calculateDTIRatio(monthlyDebtService, totalMonthlyIncome, region);

  const totalAssets = assets.reduce((acc, asset) => {
    const rate = rates[asset.currency] || 1;
    return acc + convertToBase(asset.balance, rate);
  }, 0);

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

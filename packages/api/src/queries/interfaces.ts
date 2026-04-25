import { Profile, Income, Expense, Loan, Goal, LoanPayment, Budget, BudgetPeriod } from '@stashflow/core';

export interface IProfileQuery {
  get(userId: string): Promise<Profile | null>;
  update(userId: string, updates: Partial<Profile>): Promise<Profile>;
}

export interface ITransactionQuery {
  getIncomes(userId: string): Promise<Income[]>;
  getExpenses(userId: string): Promise<Expense[]>;
}

export interface ILoanQuery {
  getAll(userId: string): Promise<Loan[]>;
  getPayments(loanId: string): Promise<LoanPayment[]>;
}

export interface IGoalQuery {
  getAll(userId: string): Promise<Goal[]>;
}

export interface IExchangeRateQuery {
  getLatest(): Promise<Record<string, number>>;
}

export interface IBudgetQuery {
  getActive(userId: string): Promise<Budget[]>;
  getPeriods(userId: string, period: string): Promise<BudgetPeriod[]>;
}

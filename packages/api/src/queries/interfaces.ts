import {
  Profile,
  Income,
  Expense,
  Loan,
  Goal,
  LoanPayment,
  Budget,
  BudgetPeriod,
  UnifiedTransaction,
  TransactionSummary,
  ExpenseCategory,
  Asset,
  AssetType,
  AssetInput,
  NetWorthSnapshot,
} from '@stashflow/core';

export interface IProfileQuery {
  get(userId: string): Promise<Profile | null>;
  update(userId: string, updates: Partial<Profile>): Promise<Profile>;
}

export interface TransactionFilterOpts {
  dateFrom?: string;
  dateTo?: string;
  type?: 'all' | 'income' | 'expense';
  search?: string;
  limit?: number;
}

export interface PeriodSummary extends TransactionSummary {
  count: number;
}

export interface HistoricalSummary extends TransactionSummary {
  month: string;
}

export interface SpendingByCategory {
  category: ExpenseCategory;
  amount: number;
}

export interface ITransactionQuery {
  getIncomes(userId: string): Promise<Income[]>;
  getExpenses(userId: string): Promise<Expense[]>;
  getAllTransactions(userId: string): Promise<UnifiedTransaction[]>;
  getTransactionSummary(userId: string, month: string): Promise<TransactionSummary>;
  getTransactionsFiltered(userId: string, opts: TransactionFilterOpts): Promise<UnifiedTransaction[]>;
  getSummaryForPeriod(userId: string, dateFrom: string, dateTo: string): Promise<PeriodSummary>;
  getHistoricalSummaries(userId: string, months: number): Promise<HistoricalSummary[]>;
  getSpendingByCategory(userId: string, dateFrom: string, dateTo: string): Promise<SpendingByCategory[]>;
}

export interface PaymentSummary {
  loanId: string;
  paidCount: number;
  nextDueDate: string | null;
}

export interface ILoanQuery {
  getAll(userId: string): Promise<Loan[]>;
  getById(loanId: string, userId: string): Promise<Loan | null>;
  getPayments(loanId: string): Promise<LoanPayment[]>;
  getPaymentSummaries(userId: string): Promise<PaymentSummary[]>;
}

export type GoalInput = {
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  type: Goal['type'];
  currency: string;
};

export interface IGoalQuery {
  getAll(userId: string): Promise<Goal[]>;
  create(userId: string, input: GoalInput): Promise<Goal>;
  update(goalId: string, updates: Partial<GoalInput>): Promise<Goal>;
  delete(goalId: string): Promise<void>;
}

export interface IExchangeRateQuery {
  getLatest(): Promise<Record<string, number>>;
}

export interface IBudgetQuery {
  getActive(userId: string): Promise<Budget[]>;
  getPeriods(userId: string, period: string): Promise<BudgetPeriod[]>;
  upsert(userId: string, category: ExpenseCategory, amount: number, currency: string): Promise<Budget>;
  delete(budgetId: string): Promise<void>;
}

export interface IAssetQuery {
  getAll(userId: string): Promise<Asset[]>;
  create(userId: string, input: AssetInput): Promise<Asset>;
  update(assetId: string, userId: string, updates: Partial<AssetInput>): Promise<Asset>;
  delete(assetId: string, userId: string): Promise<void>;
}

export interface INetWorthSnapshotQuery {
  getAll(userId: string): Promise<NetWorthSnapshot[]>;
  getLatest(userId: string): Promise<NetWorthSnapshot | null>;
  create(userId: string, snapshot: Omit<NetWorthSnapshot, 'id' | 'created_at' | 'user_id'>): Promise<NetWorthSnapshot>;
}

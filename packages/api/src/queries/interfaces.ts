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
  TransactionSummary
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

export interface ITransactionQuery {
  getIncomes(userId: string): Promise<Income[]>;
  getExpenses(userId: string): Promise<Expense[]>;
  getAllTransactions(userId: string): Promise<UnifiedTransaction[]>;
  getTransactionSummary(userId: string, month: string): Promise<TransactionSummary>;
  getTransactionsFiltered(userId: string, opts: TransactionFilterOpts): Promise<UnifiedTransaction[]>;
  getSummaryForPeriod(userId: string, dateFrom: string, dateTo: string): Promise<PeriodSummary>;
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

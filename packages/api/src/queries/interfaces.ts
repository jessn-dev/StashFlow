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

/**
 * Interface for profile-related database queries.
 */
export interface IProfileQuery {
  /**
   * Fetches a user profile by ID.
   * @param userId - The unique identifier of the user.
   * @returns A promise resolving to the Profile or null if not found.
   */
  get(userId: string): Promise<Profile | null>;

  /**
   * Updates a user profile.
   * @param userId - The unique identifier of the user.
   * @param updates - Partial profile data to update.
   * @returns A promise resolving to the updated Profile.
   */
  update(userId: string, updates: Partial<Profile>): Promise<Profile>;
}

/**
 * Filtering options for transaction queries.
 */
export interface TransactionFilterOpts {
  /** Start date filter (ISO string). */
  dateFrom?: string;
  /** End date filter (ISO string). */
  dateTo?: string;
  /** Filter by transaction type. */
  type?: 'all' | 'income' | 'expense';
  /** Search string for transaction name/merchant. */
  search?: string;
  /** Maximum number of results to return. */
  limit?: number;
  /** Pagination cursor. */
  cursor?: string | undefined;
}

/**
 * Summary of transactions for a specific period, including count.
 */
export interface PeriodSummary extends TransactionSummary {
  /** Total number of transactions in the period. */
  count: number;
}

/**
 * Summary of transactions for a specific month.
 */
export interface HistoricalSummary extends TransactionSummary {
  /** The month identifier (e.g., '2023-10'). */
  month: string;
}

/**
 * Spending breakdown by category.
 */
export interface SpendingByCategory {
  /** The expense category. */
  category: ExpenseCategory;
  /** Total amount spent in this category. */
  amount: number;
}

/**
 * Interface for transaction-related database queries.
 */
export interface ITransactionQuery {
  /** Fetches all income records for a user. */
  getIncomes(userId: string): Promise<Income[]>;
  /** Fetches all expense records for a user. */
  getExpenses(userId: string): Promise<Expense[]>;
  /** Fetches all transactions (unified view) for a user. */
  getAllTransactions(userId: string): Promise<UnifiedTransaction[]>;
  /** Gets a summary of income and expenses for a specific month. */
  getTransactionSummary(userId: string, month: string): Promise<TransactionSummary>;
  /** Fetches transactions based on provided filters. */
  getTransactionsFiltered(userId: string, opts: TransactionFilterOpts): Promise<UnifiedTransaction[]>;
  /** Gets a summary of transactions for a custom date range. */
  getSummaryForPeriod(userId: string, dateFrom: string, dateTo: string): Promise<PeriodSummary>;
  /** Gets historical transaction summaries for a specified number of months. */
  getHistoricalSummaries(userId: string, months: number): Promise<HistoricalSummary[]>;
  /** Gets spending breakdown by category for a specific date range. */
  getSpendingByCategory(userId: string, dateFrom: string, dateTo: string): Promise<SpendingByCategory[]>;
}

/**
 * Summary of loan payments.
 */
export interface PaymentSummary {
  /** Unique identifier for the loan. */
  loanId: string;
  /** Number of payments made. */
  paidCount: number;
  /** Date of the next scheduled payment. */
  nextDueDate: string | null;
}

/**
 * Interface for loan-related database queries.
 */
export interface ILoanQuery {
  /** Fetches all loans for a user. */
  getAll(userId: string): Promise<Loan[]>;
  /** Fetches a specific loan by ID. */
  getById(loanId: string, userId: string): Promise<Loan | null>;
  /** Fetches all payments associated with a specific loan. */
  getPayments(loanId: string): Promise<LoanPayment[]>;
  /** Gets payment summaries for all of a user's loans. */
  getPaymentSummaries(userId: string): Promise<PaymentSummary[]>;
}

/**
 * Input data for creating or updating a financial goal.
 */
export type GoalInput = {
  /** Name of the goal. */
  name: string;
  /** The target amount to reach. */
  target_amount: number;
  /** The current amount saved towards the goal. */
  current_amount: number;
  /** Optional deadline for the goal. */
  deadline: string | null;
  /** Type of goal (e.g., savings, debt). */
  type: Goal['type'];
  /** Currency code (e.g., 'USD'). */
  currency: string;
};

/**
 * Interface for goal-related database queries.
 */
export interface IGoalQuery {
  /** Fetches all goals for a user. */
  getAll(userId: string): Promise<Goal[]>;
  /** Creates a new financial goal. */
  create(userId: string, input: GoalInput): Promise<Goal>;
  /** Updates an existing goal. */
  update(goalId: string, updates: Partial<GoalInput>): Promise<Goal>;
  /** Deletes a goal. */
  delete(goalId: string): Promise<void>;
}

/**
 * Interface for exchange rate queries.
 */
export interface IExchangeRateQuery {
  /** Fetches the latest exchange rates for all supported currencies. */
  getLatest(): Promise<Record<string, number>>;
}

/**
 * Interface for budget-related database queries.
 */
export interface IBudgetQuery {
  /** Fetches active budgets for a user. */
  getActive(userId: string): Promise<Budget[]>;
  /** Fetches budget periods for a specific period identifier. */
  getPeriods(userId: string, period: string): Promise<BudgetPeriod[]>;
  /** Upserts a budget record. */
  upsert(userId: string, category: ExpenseCategory, amount: number, currency: string): Promise<Budget>;
  /** Deletes a budget record. */
  delete(budgetId: string): Promise<void>;
}

/**
 * Interface for asset-related database queries.
 */
export interface IAssetQuery {
  /** Fetches all assets for a user. */
  getAll(userId: string): Promise<Asset[]>;
  /** Creates a new asset record. */
  create(userId: string, input: AssetInput): Promise<Asset>;
  /** Updates an existing asset record. */
  update(assetId: string, userId: string, updates: Partial<AssetInput>): Promise<Asset>;
  /** Deletes an asset record. */
  delete(assetId: string, userId: string): Promise<void>;
}

/**
 * Interface for net worth snapshot database queries.
 */
export interface INetWorthSnapshotQuery {
  /** Fetches all net worth snapshots for a user. */
  getAll(userId: string): Promise<NetWorthSnapshot[]>;
  /** Fetches the most recent net worth snapshot. */
  getLatest(userId: string): Promise<NetWorthSnapshot | null>;
  /** Creates a new net worth snapshot record. */
  create(userId: string, snapshot: Omit<NetWorthSnapshot, 'id' | 'created_at' | 'user_id'>): Promise<NetWorthSnapshot>;
}

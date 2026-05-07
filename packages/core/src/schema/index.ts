import { type Json, Database, Tables, Enums, Constants } from './database.types';

export type { Database, Json };
export { Constants };

// Entities
export type Profile = Tables<'profiles'>;
export type Income = Tables<'incomes'>;
export type Expense = Tables<'expenses'>;
export type Loan = Tables<'loans'>;
export type LoanPayment = Tables<'loan_payments'>;
export type LoanFee = Tables<'loan_fees'>;
export type Budget = Tables<'budgets'>;
export type BudgetPeriod = Tables<'budget_periods'>;
export type Goal = Tables<'goals'>;
export type ExchangeRate = Tables<'exchange_rates'>;
export type MarketTrend = Tables<'market_trends'>;
export type CategoryMetadata = Tables<'category_metadata'>;
export type Document = Tables<'documents'>;

// New P2-A Entities
export type AssetType = 'cash' | 'investment' | 'property' | 'retirement' | 'other';

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  balance: number;
  currency: string;
  institution?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type AssetInput = Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  currency: string;
  created_at?: string | null;
}

// Enums
export type ExpenseCategory = Enums<'expense_category'>;
export type GoalType = Enums<'goal_type'>;
export type IncomeFrequency = Enums<'income_frequency'>;
export type LoanCommercialCategory = Enums<'loan_commercial_category'>;
export type LoanInterestBasis = Enums<'loan_interest_basis'>;
export type LoanInterestType = Enums<'loan_interest_type'>;
export type LoanStatus = Enums<'loan_status'>;
export type PaymentStatus = Enums<'payment_status'>;

export type Region = 'US' | 'PH' | 'SG';

export const CURRENCIES = ['USD', 'PHP', 'SGD', 'EUR', 'GBP'] as const;

export const EXPENSE_CATEGORIES = Constants.public.Enums.expense_category as unknown as ExpenseCategory[];

export interface ActivityItem {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
}

export interface UnifiedTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  date: string;
  category?: ExpenseCategory | null;
  notes?: string | null;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  currency: string;
}

export interface DashboardPayload {
  netWorth: number;
  monthlyCashFlow: number;
  totalAssets: number;
  totalLiabilities: number;
  dtiRatio: number;
  dtiHealthy: boolean;
  currency: string;
  recentActivity: ActivityItem[];
}

export interface DTIRatioResult {
  ratio: number;
  isHealthy: boolean;
  threshold: number;
  label: string;
}

export interface LoanMetrics {
  paidCount: number;
  paidPercent: number;
  remainingBalance: number;
  nextDueDate: string | null;
}

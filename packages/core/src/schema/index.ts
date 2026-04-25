import { Tables, Enums, Constants } from './database.types';

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

export interface ActivityItem {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
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

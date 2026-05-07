import { Database } from './database.types'
export type { Database }

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// ── Core entity types (from DB schema) ────────────────────────────────────────
export type Profile      = Tables<'profiles'>
export type Income       = Tables<'incomes'>
export type Expense      = Tables<'expenses'>
export type Loan         = Tables<'loans'>
export type LoanPayment  = Tables<'loan_payments'>
export type ExchangeRate = Tables<'exchange_rates'>
export type Budget       = Tables<'budgets'>
export type BudgetPeriod = Tables<'budget_periods'>
export type Goal         = Tables<'goals'>
export type LoanFee      = Tables<'loan_fees'>
export type Document     = Tables<'documents'>
export type CategoryMetadata = {
  id: string
  user_id: string
  category: ExpenseCategory
  is_essential: boolean
  created_at?: string
}

// ── Enum types ────────────────────────────────────────────────────────────────
export type ExpenseCategory  = Enums<'expense_category'>
export type IncomeFrequency  = Enums<'income_frequency'>
export type LoanStatus       = Enums<'loan_status'>
export type PaymentStatus    = Enums<'payment_status'>
export type GoalType         = Enums<'goal_type'>
export type LoanCommercialCategory = Enums<'loan_commercial_category'>
export type LoanInterestType       = Enums<'loan_interest_type'>
export type LoanInterestBasis      = Enums<'loan_interest_basis'>

// ── Business logic types ──────────────────────────────────────────────────────
export interface DTIRatioResult {
  ratio: number
  status: 'low' | 'medium' | 'high'
  color: string
}

export interface Installment {
  dueDate: string
  principal: number
  interest: number
  total: number
  remainingBalance: number
}

export interface DashboardSummary {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
}

export interface Transaction {
  id: string
  amount: number
  currency: string
  date: string
  type: 'income' | 'expense'
  category?: string
  source?: string
  description?: string
  notes?: string | null
}

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
  is_essential: boolean | null
  created_at: string | null
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

export interface BudgetRecommendation {
  allocations: Record<ExpenseCategory, number>
  rationale: string
  macroRationale?: string
  totalBudgeted: number
  disposableIncome: number
  alerts: Array<{ type: 'info' | 'warning' | 'danger', message: string }>
  userAnalysis: { problemDetected: boolean, advice: string | string[] }
  marketIndicators?: any[]
}

export interface DashboardPayload {
  isNewUser: boolean
  summary: DashboardSummary & {
    currency: string
    thisMonth: {
      income: number
      expense: number
      growth: number
    }
    budget: {
      enabled: boolean
      totalBudgeted: number
      totalSpent: number
      totalRollover: number
      freeToSpend: number
    }
  }
  dti: DTIRatioResult & {
    gross_income: number
    total_debt: number
    housing_debt: number
    front_end_ratio: number
    currency: string
    recommendation: string
    breakdown: {
      income_sources: number
      active_loans: number
    }
  }
  contingency?: {
    active: boolean
    liquidRunwayDays: number
    essentialMonthlySpend: number
  }
  marketTrends: any[]
  recentTransactions: Transaction[]
  trend: Array<{ month: string, income: number, expense: number }>
  categoryBreakdown: Array<{ category: string, amount: number, vsLastMonth: number | null }>
  budgetRecommendation?: BudgetRecommendation
  subscriptions: any[]
  habitTrend?: {
    isImproving: boolean
    score: number
    message: string
  }
  goals: Array<{
    id: string
    name: string
    progress: number
    target: number
    current: number
    type: string
    deadline: string | null
  }>
  profile: {
    full_name: string | null
    email: string
    preferred_currency: string
    budgeting_enabled: boolean
    global_rollover_enabled: boolean
    rollover_start_month: string | null
    contingency_mode_active?: boolean
  }
}

export type RateMap = Record<string, number>

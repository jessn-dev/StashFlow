import { SupabaseClient } from '@supabase/supabase-js'
import { 
  Database, 
  Budget, 
  BudgetPeriod, 
  generateSmartBudget, 
  ExpenseCategory, 
  BudgetRecommendation,
  MacroEconomicProfile
} from '@stashflow/core'
import { getDTIRatio } from './dti'
import { fetchRateMap, convertCurrency } from './exchange-rates'
import { getProfile } from './profile'

// Helper: cast supabase to any for tables not yet in generated types
const sb = (supabase: SupabaseClient<Database>) => supabase as any

function getRegionFromCurrency(currency: string): string {
  switch (currency) {
    case 'PHP': return 'Philippines'
    case 'SGD': return 'Singapore'
    case 'JPY': return 'Japan'
    case 'GBP': return 'UK'
    case 'EUR': return 'EU'
    case 'USD': return 'USA'
    default: return 'Global'
  }
}

/**
 * Generates a personalized budget recommendation based on habits and debt.
 */
export async function getSmartBudgetRecommendation(
  supabase: SupabaseClient<Database>
): Promise<BudgetRecommendation> {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()

  // 1. Fetch all required data in parallel
  const [dti, profile, rates, { data: expenses }] = await Promise.all([
    getDTIRatio(supabase),
    getProfile(supabase),
    fetchRateMap(supabase),
    supabase
      .from('expenses')
      .select('amount, currency, category')
      .gte('date', threeMonthsAgo)
      .in('category', ['housing', 'utilities', 'food'])
  ])

  const targetCurrency = profile.preferred_currency || 'USD'
  const targetRegion = getRegionFromCurrency(targetCurrency)
  
  // 2. Fetch Macro Profile from Edge Function
  let macroProfile: MacroEconomicProfile | undefined
  try {
    const { data, error } = await supabase.functions.invoke('macro-financial-advisor', {
      body: { 
        currency: targetCurrency,
        region: targetRegion
      }
    })
    if (!error) macroProfile = data
  } catch (err) {
    console.error('Failed to fetch macro profile:', err)
  }

  // 3. Calculate 3-month rolling averages for essentials
  const essentialTotals: Partial<Record<ExpenseCategory, number>> = {
    housing: 0,
    utilities: 0,
    food: 0
  }

  expenses?.forEach(exp => {
    const cat = exp.category as ExpenseCategory
    const converted = convertCurrency(Number(exp.amount), exp.currency, targetCurrency, rates)
    essentialTotals[cat] = (essentialTotals[cat] || 0) + converted
  })

  // Divide by 3 to get monthly average
  const essentialAverages: Partial<Record<ExpenseCategory, number>> = {
    housing: (essentialTotals.housing || 0) / 3,
    utilities: (essentialTotals.utilities || 0) / 3,
    food: (essentialTotals.food || 0) / 3
  }

  // 4. Execute core algorithm
  return generateSmartBudget(
    dti.gross_income,
    dti.total_debt,
    dti.status,
    essentialAverages,
    macroProfile
  )
}

/**
 * Fetch all baseline budgets for a user
 */
export async function getBudgets(supabase: SupabaseClient<Database>): Promise<Budget[]> {
  const { data, error } = await sb(supabase).from('budgets').select('*')
  if (error) throw error
  return (data ?? []) as Budget[]
}

/**
 * Upsert a baseline budget limit
 */
export async function upsertBudget(
  supabase: SupabaseClient<Database>,
  budget: Omit<Budget, 'id' | 'user_id' | 'created_at'>
): Promise<Budget> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await sb(supabase)
    .from('budgets')
    .upsert({ ...budget, user_id: user.id }, { onConflict: 'user_id,category' })
    .select()
    .single()

  if (error) throw error
  return data as Budget
}

/**
 * Fetch budget snapshot for a specific month (YYYY-MM)
 */
export async function getBudgetPeriod(
  supabase: SupabaseClient<Database>,
  period: string
): Promise<BudgetPeriod[]> {
  const { data, error } = await sb(supabase)
    .from('budget_periods')
    .select('*')
    .eq('period', period)

  if (error) throw error
  return (data ?? []) as BudgetPeriod[]
}

/**
 * Rebalance: Shift funds between categories.
 */
export async function rebalanceBudget(
  supabase: SupabaseClient<Database>,
  payload: {
    fromCategory: string
    toCategory: string
    amount: number
    period: string
    permanent: boolean
  }
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  // Stubbed — implement atomic rebalance in a future milestone
}

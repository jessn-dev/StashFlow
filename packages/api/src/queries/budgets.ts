import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Budget, BudgetPeriod } from '@stashflow/core'

// Helper: cast supabase to any for tables not yet in generated types
const sb = (supabase: SupabaseClient<Database>) => supabase as any

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

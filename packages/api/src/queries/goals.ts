import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Goal } from '@stashflow/core'

// Helper: cast supabase to any for tables not yet in generated types
const sb = (supabase: SupabaseClient<Database>) => supabase as any

/**
 * Fetch all goals for a user
 */
export async function getGoals(supabase: SupabaseClient<Database>): Promise<Goal[]> {
  const { data, error } = await sb(supabase)
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Goal[]
}

/**
 * Create or update a goal
 */
export async function upsertGoal(
  supabase: SupabaseClient<Database>,
  goal: Omit<Goal, 'id' | 'user_id' | 'created_at'> & { id?: string }
): Promise<Goal> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await sb(supabase)
    .from('goals')
    .upsert({ ...goal, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Goal
}

/**
 * Update current progress of a goal
 */
export async function updateGoalProgress(
  supabase: SupabaseClient<Database>,
  goalId: string,
  currentAmount: number
) {
  const { error } = await sb(supabase)
    .from('goals')
    .update({ current_amount: currentAmount })
    .eq('id', goalId)

  if (error) throw error
}

/**
 * Delete a goal
 */
export async function deleteGoal(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await sb(supabase).from('goals').delete().eq('id', id)
  if (error) throw error
}

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@fintrack/core'

export type IncomeInsert = Database['public']['Tables']['incomes']['Insert']
export type IncomeUpdate = Database['public']['Tables']['incomes']['Update']

/**
 * Fetch all income entries for the authenticated user
 */
export async function getIncomes(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create a new income entry
 */
export async function createIncome(supabase: SupabaseClient<Database>, income: IncomeInsert) {
  const { data, error } = await supabase
    .from('incomes')
    .insert(income)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete an income entry
 */
export async function deleteIncome(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

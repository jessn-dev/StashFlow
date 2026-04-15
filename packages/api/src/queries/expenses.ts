import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Transaction } from '@fintrack/core'

export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

/**
 * Fetch all expenses for the authenticated user
 */
export async function getExpenses(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create a new expense
 */
export async function createExpense(supabase: SupabaseClient<Database>, expense: ExpenseInsert) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete an expense
 */
export async function deleteExpense(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

/**
 * Fetch expenses grouped by category for the current user
 */
export async function getExpensesByCategory(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')

  if (error) throw error

  const totals: Record<string, number> = {}
  data.forEach((item) => {
    totals[item.category] = (totals[item.category] || 0) + Number(item.amount)
  })

  return Object.entries(totals).map(([category, amount]) => ({
    category,
    amount
  }))
}

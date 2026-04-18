import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Transaction } from '@stashflow/core'

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

import { fetchRateMap, convertCurrency } from './exchange-rates'
import { getProfile } from './profile'

/**
 * Fetch expenses grouped by category for the current user, converted to preferred currency.
 */
export async function getExpensesByCategory(supabase: SupabaseClient<Database>) {
  const [
    { data: expenses, error },
    profile,
    rates
  ] = await Promise.all([
    supabase.from('expenses').select('category, amount, currency'),
    getProfile(supabase),
    fetchRateMap(supabase)
  ])

  if (error) throw error

  const targetCurrency = profile.preferred_currency || 'USD'
  const totals: Record<string, number> = {}

  expenses?.forEach((item) => {
    const convertedAmount = convertCurrency(Number(item.amount), item.currency, targetCurrency, rates)
    totals[item.category] = (totals[item.category] || 0) + convertedAmount
  })

  return Object.entries(totals).map(([category, amount]) => ({
    category,
    amount: Number(amount.toFixed(2))
  }))
}

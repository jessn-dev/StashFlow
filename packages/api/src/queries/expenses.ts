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

/**
 * Intelligent Detection of Recurring Subscriptions
 */
export function detectSubscriptions(transactions: any[]) {
  const recurringMap: Record<string, any[]> = {}
  
  // Group by exact description (normalized)
  transactions.forEach(tx => {
    if (tx.type !== 'expense') return
    const key = tx.description?.toLowerCase().trim() || 'unknown'
    if (!recurringMap[key]) recurringMap[key] = []
    recurringMap[key].push(tx)
  })

  const detections: any[] = []

  Object.entries(recurringMap).forEach(([name, items]) => {
    if (items.length < 2) return // Need at least 2 occurrences

    // Sort by date
    const sorted = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Check for consistent intervals (approx 28-32 days)
    let consistent = true
    let lastDate = new Date(sorted[0].date)
    
    for (let i = 1; i < sorted.length; i++) {
      const currentDate = new Date(sorted[i].date)
      const diffDays = Math.ceil(Math.abs(currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // If gap is too small (< 25) or too large (> 35), not a standard monthly sub
      if (diffDays < 25 || diffDays > 35) {
        consistent = false
        break
      }
      lastDate = currentDate
    }

    if (consistent) {
      detections.push({
        name: items[0].description,
        amount: items[0].amount,
        currency: items[0].currency,
        category: items[0].category,
        frequency: 'monthly',
        count: items.length,
        lastDate: sorted[sorted.length - 1].date
      })
    }
  })

  return detections
}

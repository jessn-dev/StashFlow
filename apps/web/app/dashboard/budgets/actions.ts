'use server'

import { createClient } from '@/utils/supabase/server'
import { upsertBudget, updateProfile, getSmartBudgetRecommendation } from '@stashflow/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ExpenseCategory } from '@stashflow/core'

export async function upsertBudgetAction(category: ExpenseCategory, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    await upsertBudget(supabase, { category, amount, currency: 'USD', rollover_enabled: true })
    
    // Also update current period if it exists
    const period = new Date().toISOString().slice(0, 7)
    await (supabase as any).from('budget_periods')
      .update({ budgeted: amount })
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('period', period)

  } catch (error) {
    console.error('Failed to update budget:', error)
    return { error: 'Failed to update budget' }
  }

  revalidatePath('/dashboard/budgets')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBudgetAction({ id, amount }: { id: string, amount: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    // 1. Update the period record (referenced by id)
    const { data: periodData, error: periodError } = await (supabase as any)
      .from('budget_periods')
      .update({ budgeted: amount })
      .eq('id', id)
      .select('category')
      .single()

    if (periodError) throw periodError

    // 2. Sync back to the baseline budget
    if (periodData?.category) {
      await upsertBudget(supabase, { 
        category: periodData.category as ExpenseCategory, 
        amount, 
        currency: 'USD', 
        rollover_enabled: true 
      })
    }
  } catch (error) {
    console.error('Failed to update budget period:', error)
    return { error: 'Failed to update budget' }
  }

  revalidatePath('/dashboard/budgets')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getBudgetRecommendationAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  try {
    const recommendation = await getSmartBudgetRecommendation(supabase)
    return { success: true, recommendation }
  } catch (error: any) {
    return { error: error.message || 'Failed to generate recommendation' }
  }
}

export async function updateBudgetSettingsAction(settings: { budgeting_enabled?: boolean; global_rollover_enabled?: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Translate the UI fields to DB column names
  const updateData: { budgeting_enabled?: boolean; rollover_start_month?: string | null } = {}
  if (settings.budgeting_enabled !== undefined) {
    updateData.budgeting_enabled = settings.budgeting_enabled
  }
  if (settings.global_rollover_enabled !== undefined) {
    // Store rollover start as current month when enabled, null when disabled
    updateData.rollover_start_month = settings.global_rollover_enabled
      ? new Date().toISOString().slice(0, 7)
      : null
  }

  try {
    await updateProfile(supabase, updateData)
  } catch (error) {
    return { error: 'Failed to update settings' }
  }

  revalidatePath('/dashboard/budgets')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { upsertGoal, deleteGoal, updateGoalProgress } from '@stashflow/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addGoalAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const goalData = {
    name: formData.get('name') as string,
    target_amount: Number(formData.get('target_amount')),
    current_amount: Number(formData.get('current_amount')) || 0,
    type: formData.get('type') as 'savings' | 'debt',
    deadline: formData.get('deadline') as string || null,
    currency: (formData.get('currency') as string) || 'USD'
  }

  try {
    await upsertGoal(supabase, goalData)
  } catch (error) {
    console.error('Failed to add goal:', error)
    return { error: 'Failed to add goal' }
  }

  revalidatePath('/dashboard/goals')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function removeGoalAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    await deleteGoal(supabase, id)
  } catch (error) {
    return { error: 'Failed to delete goal' }
  }

  revalidatePath('/dashboard/goals')
  revalidatePath('/dashboard')
  return { success: true }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { createExpense, deleteExpense } from '@fintrack/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Database } from '@fintrack/core'

type ExpenseCategory = Database['public']['Enums']['expense_category']

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const amount = Number(formData.get('amount'))
  const currency = formData.get('currency') as string
  const category = formData.get('category') as ExpenseCategory
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const is_recurring = formData.get('is_recurring') === 'on'
  const notes = formData.get('notes') as string

  try {
    await createExpense(supabase, {
      user_id: user.id,
      amount,
      currency,
      category,
      description,
      date,
      is_recurring,
      notes
    })
  } catch (error) {
    console.error('Failed to create expense:', error)
    return { error: 'Failed to create expense' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/spending')
  return { success: true }
}

export async function removeExpense(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    await deleteExpense(supabase, id)
  } catch (error) {
    console.error('Failed to delete expense:', error)
    return { error: 'Failed to delete expense' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/spending')
  return { success: true }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { createIncome, deleteIncome } from '@stashflow/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Database } from '@stashflow/core'

type IncomeFrequency = Database['public']['Enums']['income_frequency']

export async function addIncome(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const amount = Number(formData.get('amount'))
  const currency = formData.get('currency') as string
  const source = formData.get('source') as string
  const frequency = formData.get('frequency') as IncomeFrequency
  const date = formData.get('date') as string
  const notes = formData.get('notes') as string

  try {
    await createIncome(supabase, {
      user_id: user.id,
      amount,
      currency,
      source,
      frequency,
      date,
      notes
    })
  } catch (error) {
    console.error('Failed to create income:', error)
    return { error: 'Failed to create income' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/income')
  return { success: true }
}

export async function removeIncome(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    await deleteIncome(supabase, id)
  } catch (error) {
    console.error('Failed to delete income:', error)
    return { error: 'Failed to delete income' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/income')
  return { success: true }
}

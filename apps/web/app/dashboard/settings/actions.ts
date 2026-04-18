'use server'

import { createClient } from '@/utils/supabase/server'
import { updateProfile } from '@stashflow/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateCurrencyAction(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const preferred_currency = formData.get('currency') as string

  try {
    await updateProfile(supabase, { preferred_currency })
  } catch (error) {
    console.error('Failed to update currency:', error)
    return { error: 'Failed to update currency' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateContingencyAction(active: boolean) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  try {
    await updateProfile(supabase, { contingency_mode_active: active } as any)
  } catch (error) {
    console.error('Failed to update contingency mode:', error)
    return { error: 'Failed to update contingency mode' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}

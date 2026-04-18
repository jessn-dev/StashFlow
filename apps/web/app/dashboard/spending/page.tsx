import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getExpenses, getExpensesByCategory, getProfile, fetchRateMap } from '@stashflow/api'
import SpendingUI from './SpendingUI'

export default async function SpendingPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  const [expenses, breakdown, profile, rates] = await Promise.all([
    getExpenses(supabase),
    getExpensesByCategory(supabase),
    getProfile(supabase),
    fetchRateMap(supabase)
  ])

  return (
    <SpendingUI 
      expenses={expenses}
      breakdown={breakdown}
      preferredCurrency={profile.preferred_currency || 'USD'}
      rates={rates}
    />
  )
}

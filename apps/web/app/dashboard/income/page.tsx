import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getIncomes, getProfile, fetchRateMap } from '@stashflow/api'
import IncomeUI from './IncomeUI'

export default async function IncomePage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  const [incomes, profile, rates] = await Promise.all([
    getIncomes(supabase),
    getProfile(supabase),
    fetchRateMap(supabase)
  ])

  return (
    <IncomeUI 
      incomes={incomes}
      preferredCurrency={profile.preferred_currency || 'USD'}
      rates={rates}
    />
  )
}

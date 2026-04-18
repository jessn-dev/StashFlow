import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getBudgetPeriod, getProfile } from '@stashflow/api'
import BudgetsUI from './BudgetsUI'

export default async function BudgetsPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const currentPeriod = new Date().toISOString().slice(0, 7)
  const [periods, profile] = await Promise.all([
    getBudgetPeriod(supabase, currentPeriod),
    getProfile(supabase)
  ])

  return (
    <BudgetsUI 
      periods={periods}
      profile={profile}
      userEmail={user.email || ''}
    />
  )
}

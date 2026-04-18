import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getGoals } from '@stashflow/api'
import GoalsUI from './GoalsUI'

export default async function GoalsPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const goals = await getGoals(supabase)

  return (
    <GoalsUI 
      goals={goals}
      userEmail={user.email || ''}
    />
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getDashboardPayload } from '@stashflow/api'
import DashboardUI from '@/components/dashboard/DashboardUI'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Fetch unified dashboard data from Edge Function
  const payload = await getDashboardPayload(supabase)

  return (
    <DashboardUI 
      payload={payload}
      userEmail={user.email}
    />
  )
}

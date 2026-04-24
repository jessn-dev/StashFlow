import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { fetchDashboardData } from '@/modules/dashboard'
import DashboardUI from '@/components/dashboard/DashboardUI'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Fetch unified dashboard data using modular architecture
  const payload = await fetchDashboardData()

  return (
    <DashboardUI 
      payload={payload}
      userEmail={user.email}
    />
  )
}

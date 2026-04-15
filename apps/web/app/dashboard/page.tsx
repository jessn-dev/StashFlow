import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getDashboardSummary, getRecentTransactions } from '@fintrack/api'
import DashboardUI from '@/components/dashboard/DashboardUI'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch user securely on the server side to protect the route
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch Dashboard Data
  const summary = await getDashboardSummary(supabase)
  const transactions = await getRecentTransactions(supabase)

  return (
    <DashboardUI 
      userEmail={user.email}
      summary={summary}
      transactions={transactions}
    />
  )
}

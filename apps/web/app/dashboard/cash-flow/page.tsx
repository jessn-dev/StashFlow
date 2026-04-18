import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCashFlowProjections } from '@stashflow/api'
import CashFlowUI from './CashFlowUI'

export default async function CashFlowPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const payload = await getCashFlowProjections(supabase)

  return (
    <CashFlowUI 
      payload={payload}
      userEmail={user.email || ''}
    />
  )
}

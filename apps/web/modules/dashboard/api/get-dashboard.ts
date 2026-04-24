import { createClient } from '@/utils/supabase/client'
import { getDashboardPayload } from '@stashflow/api'

export async function fetchDashboardData() {
  const supabase = createClient()
  return await getDashboardPayload(supabase)
}

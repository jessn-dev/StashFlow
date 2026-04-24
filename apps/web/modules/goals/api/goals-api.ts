import { createClient } from '@/utils/supabase/client'

export async function fetchGoals() {
  const supabase = createClient()
  const { data, error } = await supabase.from('goals').select('*')
  if (error) throw error
  return data || []
}

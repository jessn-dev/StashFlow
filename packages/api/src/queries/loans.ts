import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@stashflow/core'

/**
 * Fetch all loans for the authenticated user
 */
export async function getLoans(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

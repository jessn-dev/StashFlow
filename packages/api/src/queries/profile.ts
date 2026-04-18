import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Profile } from '@stashflow/core'

/**
 * Fetch the authenticated user's profile
 */
export async function getProfile(supabase: SupabaseClient<Database>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * Update the authenticated user's profile
 */
export async function updateProfile(
  supabase: SupabaseClient<Database>,
  updates: Partial<Pick<Profile, 'full_name' | 'preferred_currency' | 'budgeting_enabled' | 'rollover_start_month'>>
): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

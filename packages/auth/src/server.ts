import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export async function getUser(client: SupabaseClient<Database>): Promise<User | null> {
  const { data: { user } } = await client.auth.getUser()
  return user
}

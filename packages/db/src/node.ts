import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export function createNodeClient(url: string, anonKey: string): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey)
}

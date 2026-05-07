import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export function createBrowserClient(url: string, anonKey: string): SupabaseClient<Database> {
  return _createBrowserClient<Database>(url, anonKey)
}

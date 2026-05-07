import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export interface MobileStorageAdapter {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

export function createMobileClient(
  url: string,
  anonKey: string,
  storage: MobileStorageAdapter,
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      storage: storage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}

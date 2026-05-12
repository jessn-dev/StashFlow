import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export interface ServerCookieHandlers {
  get(name: string): string | undefined
  set(name: string, value: string, options: CookieOptions): void
  remove(name: string, options: CookieOptions): void
}

export function createServerClient(
  url: string,
  anonKey: string,
  cookies: ServerCookieHandlers,
): SupabaseClient<Database> {
  return _createServerClient<Database>(url, anonKey, { cookies })
}

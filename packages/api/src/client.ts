import { createClient, SupabaseClientOptions, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@stashflow/core'

export interface SupabaseConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  /**
   * Typed Supabase client options — avoids `any` and surfaces valid config
   * keys (auth, global, realtime, etc.) at the call site.
   */
  options?: SupabaseClientOptions<'public'>
}

/**
 * Creates a standard typed Supabase client for use in mobile and shared
 * (non-SSR) contexts.
 *
 * Web (SSR) note: the Next.js app should NOT use this function directly.
 * It uses @supabase/ssr via apps/web/utils/supabase/server.ts and client.ts
 * to ensure cookies are handled correctly in the Next.js 15 async context.
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient<Database> {
  return createClient<Database>(
    config.supabaseUrl,
    config.supabaseAnonKey,
    config.options
  )
}

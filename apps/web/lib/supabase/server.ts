import { createServerClient } from '@stashflow/db/server'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => { try { cookieStore.set({ name, value, ...options }) } catch {} },
      remove: (name, options) => { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
    },
  )
}

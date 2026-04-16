import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()

  // If a session exists, securely terminate it
  if (session) {
    await supabase.auth.signOut()
  }

  // Always redirect to the landing page, regardless of auth state
  return NextResponse.redirect(new URL('/', request.url))
}
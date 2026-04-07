'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server' // Adjust this import based on your Supabase SSR setup

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=Could not authenticate user. Check your credentials.')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return redirect(`/login?mode=signup&message=${error.message}`)
  }

  // If Supabase requires email verification, it will not return a session immediately.
  if (!data.session) {
    return redirect('/login?message=Success! Please check your email to verify your account.')
  }

  // If auto-confirm is enabled in your Supabase project, log them in directly
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Generic message prevents account enumeration — do not forward error.message
    return redirect(`/login?message=${encodeURIComponent('Invalid email or password.')}`)
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error, data } = await supabase.auth.signUp({ email, password })

  if (error) {
    return redirect(`/login?mode=signup&message=${encodeURIComponent(error.message)}`)
  }

  // No session means email verification is required
  if (!data.session) {
    return redirect(`/login?message=${encodeURIComponent('Success! Please check your email to verify your account.')}`)
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  // Static import + null fallback — avoids dynamic import overhead and handles
  // cases where the Origin header is absent (e.g. proxied requests).
  const requestHeaders = await headers()
  const origin =
    requestHeaders.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return redirect(`/forgot-password?message=${encodeURIComponent(error.message)}`)
  }

  // Generic success message — do not reveal whether the email is registered
  return redirect(
    `/forgot-password?message=${encodeURIComponent("If this email is registered, you'll receive a reset link shortly.")}`
  )
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return redirect(`/reset-password?message=${encodeURIComponent('Passwords do not match.')}`)
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return redirect(`/reset-password?message=${encodeURIComponent(error.message)}`)
  }

  return redirect(`/login?message=${encodeURIComponent('Password updated successfully. Please sign in.')}`)
}

'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function getFieldValue(formData: FormData, name: string): string | null {
  // 1. Try direct match
  const directValue = formData.get(name)
  if (directValue !== null) return directValue as string

  // 2. Try prefixed match (React 19/Next.js 15+ "index_name" format)
  // This happens when multiple actions or forms are present.
  for (const key of Array.from(formData.keys())) {
    if (/^\d+_/.test(key) && key.split('_').slice(1).join('_') === name) {
      return formData.get(key) as string
    }
  }

  return null
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = getFieldValue(formData, 'email')
  const password = getFieldValue(formData, 'password')

  if (!email || !password) {
    console.error('Login: Missing email or password in formData', Array.from(formData.keys()))
    return redirect(`/login?message=${encodeURIComponent('Please enter both email and password.')}`)
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Generic message prevents account enumeration — do not forward error.message
    console.error('Login error:', error)
    return redirect(`/login?message=${encodeURIComponent('Invalid email or password.')}`)
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = getFieldValue(formData, 'email')
  const password = getFieldValue(formData, 'password')

  if (!email || !password) {
    return redirect(`/login?mode=signup&message=${encodeURIComponent('Please enter both email and password.')}`)
  }

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
  const email = getFieldValue(formData, 'email')

  if (!email) {
    return redirect(`/login?mode=forgot&message=${encodeURIComponent('Please enter your email.')}`)
  }

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
    return redirect(`/login?mode=forgot&message=${encodeURIComponent(error.message)}`)
  }

  // Generic success message — do not reveal whether the email is registered
  return redirect(
    `/login?mode=forgot&message=${encodeURIComponent("If this email is registered, you'll receive a reset link shortly.")}`
  )
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const password = getFieldValue(formData, 'password')
  const confirmPassword = getFieldValue(formData, 'confirmPassword')

  if (!password || !confirmPassword) {
    return redirect(`/reset-password?message=${encodeURIComponent('Please fill in both password fields.')}`)
  }

  if (password !== confirmPassword) {
    return redirect(`/reset-password?message=${encodeURIComponent('Passwords do not match.')}`)
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return redirect(`/reset-password?message=${encodeURIComponent(error.message)}`)
  }

  return redirect(`/login?message=${encodeURIComponent('Password updated successfully. Please sign in.')}`)
}

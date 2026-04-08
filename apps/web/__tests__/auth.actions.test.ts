import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, signup, forgotPassword, resetPassword } from '../app/(auth)/login/actions'
import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'

// Mock dependencies
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['origin', 'http://localhost:3000']])),
}))

vi.mock('../utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Auth Server Actions', () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  describe('login', () => {
    it('should redirect to dashboard on success', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null })
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      await login(formData)

      expect(redirect).toHaveBeenCalledWith('/dashboard')
    })

    it('should redirect with error message on failure', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid' } })
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'wrong')

      await login(formData)

      expect(redirect).toHaveBeenCalledWith('/login?message=Invalid%20email%20or%20password.')
    })
  })

  describe('signup', () => {
    it('should redirect to dashboard on immediate session', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({ data: { session: {} }, error: null })
      const formData = new FormData()
      formData.append('email', 'new@example.com')
      formData.append('password', 'password123')

      await signup(formData)

      expect(redirect).toHaveBeenCalledWith('/dashboard')
    })

    it('should redirect with verification message if no session', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
      const formData = new FormData()
      await signup(formData)

      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('check%20your%20email'))
    })
  })

  describe('forgotPassword', () => {
    it('should send reset link and redirect with success message', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
      const formData = new FormData()
      formData.append('email', 'reset@example.com')

      await forgotPassword(formData)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('receive%20a%20reset%20link'))
    })
  })

  describe('resetPassword', () => {
    it('should update password and redirect to login', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null })
      const formData = new FormData()
      formData.append('password', 'newpassword')
      formData.append('confirmPassword', 'newpassword')

      await resetPassword(formData)

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword' })
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('Password%20updated'))
    })

    it('should fail if passwords do not match', async () => {
      const formData = new FormData()
      formData.append('password', 'pass1')
      formData.append('confirmPassword', 'pass2')

      await resetPassword(formData)

      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('do%20not%20match'))
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProfile, updateProfile } from './profile'
import { SupabaseClient } from '@supabase/supabase-js'

const mockUser = { id: 'user-1' }
const mockProfile = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  preferred_currency: 'USD',
  budgeting_enabled: false,
  rollover_start_month: null,
}

function makeAuth(user: typeof mockUser | null) {
  return { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) }
}

describe('getProfile', () => {
  it('returns the user profile', async () => {
    const supabase = {
      auth: makeAuth(mockUser),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const result = await getProfile(supabase)
    expect(result).toEqual(mockProfile)
  })

  it('throws when not authenticated', async () => {
    const supabase = { auth: makeAuth(null) } as unknown as SupabaseClient
    await expect(getProfile(supabase)).rejects.toThrow('Unauthorized')
  })
})

describe('updateProfile', () => {
  it('updates and returns the profile', async () => {
    const updated = { ...mockProfile, full_name: 'New Name' }
    const supabase = {
      auth: makeAuth({ ...mockUser, email: 'test@example.com' }),
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updated, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const result = await updateProfile(supabase, { full_name: 'New Name' })
    expect(result.full_name).toBe('New Name')
  })

  it('throws when not authenticated', async () => {
    const supabase = { auth: makeAuth(null) } as unknown as SupabaseClient
    await expect(updateProfile(supabase, {})).rejects.toThrow('Unauthorized')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { ProfileQuery } from './profile'
import { SupabaseClient } from '@supabase/supabase-js'

const mockUser = { id: 'user-1' }
const mockProfile = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  preferred_currency: 'USD',
  budgeting_enabled: false,
}

describe('ProfileQuery', () => {
  it('returns the user profile', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const query = new ProfileQuery(supabase)
    const result = await query.get(mockUser.id)
    expect(result).toEqual(mockProfile)
  })

  it('updates and returns the profile', async () => {
    const updated = { ...mockProfile, full_name: 'New Name' }
    const supabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const query = new ProfileQuery(supabase)
    const result = await query.update(mockUser.id, { full_name: 'New Name' })
    expect(result.full_name).toBe('New Name')
  })
})

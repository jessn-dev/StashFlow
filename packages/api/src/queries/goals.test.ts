import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGoals, upsertGoal, updateGoalProgress, deleteGoal } from './goals'
import { SupabaseClient } from '@supabase/supabase-js'

const mockUser = { id: 'user-1' }
const mockGoal = {
  id: 'g1', user_id: 'user-1', name: 'Emergency Fund',
  target_amount: 20000, current_amount: 5000, type: 'savings', currency: 'USD', deadline: null, created_at: null,
}

function makeAuth(user: typeof mockUser | null) {
  return { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) }
}

describe('getGoals', () => {
  it('returns all goals ordered by created_at', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockGoal], error: null }),
        }),
      }),
    } as unknown as SupabaseClient

    const result = await getGoals(supabase)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Emergency Fund')
  })
})

describe('upsertGoal', () => {
  it('inserts a new goal and returns it', async () => {
    const supabase = {
      auth: makeAuth(mockUser),
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockGoal, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    const result = await upsertGoal(supabase, {
      name: 'Emergency Fund', target_amount: 20000, current_amount: 0,
      type: 'savings', currency: 'USD', deadline: null,
    })
    expect(result).toEqual(mockGoal)
  })

  it('throws when not authenticated', async () => {
    const supabase = { auth: makeAuth(null) } as unknown as SupabaseClient
    await expect(upsertGoal(supabase, {} as any)).rejects.toThrow()
  })
})

describe('updateGoalProgress', () => {
  it('updates current_amount for a goal', async () => {
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const supabase = {
      from: vi.fn().mockReturnValue({ update: updateFn }),
    } as unknown as SupabaseClient

    await updateGoalProgress(supabase, 'g1', 8000)
    expect(updateFn).toHaveBeenCalledWith({ current_amount: 8000 })
  })
})

describe('deleteGoal', () => {
  it('deletes a goal by id', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(deleteGoal(supabase, 'g1')).resolves.toBeUndefined()
  })

  it('throws when delete errors', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('delete error') }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(deleteGoal(supabase, 'g1')).rejects.toThrow('delete error')
  })
})

describe('error paths', () => {
  it('getGoals throws on error', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('query error') }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(getGoals(supabase)).rejects.toThrow('query error')
  })

  it('upsertGoal throws on db error after auth', async () => {
    const supabase = {
      auth: makeAuth(mockUser),
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('upsert error') }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(upsertGoal(supabase, {} as any)).rejects.toThrow('upsert error')
  })

  it('updateGoalProgress throws on error', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('update error') }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(updateGoalProgress(supabase, 'g1', 5000)).rejects.toThrow('update error')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardService } from './DashboardService'
import { SupabaseClient } from '@supabase/supabase-js'

const mockUser = { id: 'u1' }
const mockProfile = { preferred_currency: 'USD', budgeting_enabled: true }

function mkChain(data: any) {
  const obj: any = {
    select: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    gte: vi.fn(() => obj),
    order: vi.fn(() => obj),
    limit: vi.fn(() => obj),
    single: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null })),
    then: (resolve: any) => resolve({ data: Array.isArray(data) ? data : [data], error: null })
  }
  return obj
}

describe('DashboardService', () => {
  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn()
  } as unknown as SupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should aggregate data into a valid payload', async () => {
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return mkChain(mockProfile)
      if (table === 'incomes') return mkChain([{ amount: 5000, currency: 'USD', source: 'Salary', date: new Date().toISOString() }])
      if (table === 'goals') return mkChain([{ current_amount: 5000, target_amount: 10000, currency: 'USD', name: 'Savings' }])
      return mkChain([])
    })

    const service = new DashboardService(mockSupabase)
    const payload = await service.getPayload()

    expect(payload.summary.currency).toBe('USD')
    expect(payload.summary.totalAssets).toBe(5000)
    expect(payload.profile.budgeting_enabled).toBe(true)
  })

  it('should handle null/missing data for all fields', async () => {
    vi.mocked(mockSupabase.from).mockReturnValue(mkChain(null))

    const service = new DashboardService(mockSupabase)
    const payload = await service.getPayload()

    expect(payload.summary.totalAssets).toBe(0)
    expect(payload.summary.currency).toBe('USD')
    expect(payload.isNewUser).toBe(true)
  })

  it('should handle partial data (missing profile but having incomes)', async () => {
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return mkChain(null)
      if (table === 'incomes') return mkChain([{ amount: 1000, currency: 'EUR', source: 'Side Hustle', date: '2026-01-01' }])
      return mkChain([])
    })

    const service = new DashboardService(mockSupabase)
    const payload = await service.getPayload()

    expect(payload.summary.currency).toBe('USD') // default
    expect(payload.isNewUser).toBe(true)
  })

  it('should handle empty data gracefully', async () => {
    vi.mocked(mockSupabase.from).mockReturnValue(mkChain([]))

    const service = new DashboardService(mockSupabase)
    const payload = await service.getPayload()

    expect(payload.summary.totalAssets).toBe(0)
    expect(payload.dti.ratio).toBe(0)
  })
})

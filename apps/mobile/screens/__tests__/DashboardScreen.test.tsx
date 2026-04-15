import React from 'react'
import { render, waitFor, screen } from '@testing-library/react-native'
import { DashboardScreen } from '../DashboardScreen'
import { useAuth } from '../../contexts/AuthContext'
import { getDashboardSummary, getRecentTransactions } from '@fintrack/api'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock Auth Context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock FinTrack API
vi.mock('@fintrack/api', () => ({
  getDashboardSummary: vi.fn(),
  getRecentTransactions: vi.fn(),
}))

// Mock Supabase
vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('DashboardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { email: 'mobile@example.com' } },
      loading: false,
    } as any)

    vi.mocked(getDashboardSummary).mockResolvedValue({
      netWorth: 12500,
      totalAssets: 15000,
      totalLiabilities: 2500,
    })

    vi.mocked(getRecentTransactions).mockResolvedValue([
      {
        id: 'tx1',
        amount: 500,
        currency: 'USD',
        date: '2026-04-10',
        type: 'income',
        source: 'Freelance',
      }
    ] as any)
  })

  it('renders loading state initially', async () => {
    // Note: To see loading, we need to make API calls stay in pending state or just check if it renders before waitFor
    const { getByType } = render(<DashboardScreen />)
    expect(getByType(require('react-native').ActivityIndicator)).toBeTruthy()
  })

  it('renders dashboard data after fetching', async () => {
    render(<DashboardScreen />)

    await waitFor(() => {
      expect(screen.getByText('mobile@example.com')).toBeTruthy()
      expect(screen.getByText('Overview')).toBeTruthy()
      expect(screen.getByText('$12,500.00')).toBeTruthy() // Net Worth
      expect(screen.getByText('$15,000.00')).toBeTruthy() // Total Assets
      expect(screen.getByText('$2,500.00')).toBeTruthy()  // Liabilities
    })

    expect(screen.getByText('Freelance')).toBeTruthy()
    expect(screen.getByText('+$500.00')).toBeTruthy()
  })

  it('renders empty state when no transactions exist', async () => {
    vi.mocked(getRecentTransactions).mockResolvedValue([])

    render(<DashboardScreen />)

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeTruthy()
    })
    expect(screen.getByText(/Start tracking your expenses/i)).toBeTruthy()
  })
})

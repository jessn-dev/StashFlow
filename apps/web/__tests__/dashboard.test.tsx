import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DashboardUI from '@/components/dashboard/DashboardUI'
import { DashboardPayload } from '@stashflow/api'

const mockPayload: DashboardPayload = {
  summary: {
    netWorth: 10000,
    totalAssets: 15000,
    totalLiabilities: 5000,
    currency: 'USD',
    thisMonth: { income: 5000, expense: 1200, growth: -5 },
    budget: { enabled: false, totalBudgeted: 0, totalSpent: 0, totalRollover: 0, freeToSpend: 0 },
  },
  dti: {
    ratio: 24,
    status: 'low',
    color: '#1A7A7A',
    gross_income: 5000,
    total_debt: 1200,
    housing_debt: 0,
    front_end_ratio: 0,
    currency: 'USD',
    recommendation: 'Your DTI is healthy — keep it up!',
    breakdown: { income_sources: 1, active_loans: 1 },
  },
  recentTransactions: [
    {
      id: '1',
      amount: 1200,
      currency: 'USD',
      date: '2026-04-01',
      type: 'expense' as const,
      category: 'housing',
      description: 'Monthly Rent',
    },
    {
      id: '2',
      amount: 5000,
      currency: 'USD',
      date: '2026-04-01',
      type: 'income' as const,
      source: 'Monthly Salary',
    },
  ],
  trend: [
    { month: 'Nov', income: 5000, expense: 1000 },
    { month: 'Dec', income: 5000, expense: 1100 },
    { month: 'Jan', income: 5000, expense: 1200 },
    { month: 'Feb', income: 5000, expense: 1150 },
    { month: 'Mar', income: 5000, expense: 1300 },
    { month: 'Apr', income: 5000, expense: 1200 },
  ],
  categoryBreakdown: [
    { category: 'housing', amount: 1200, vsLastMonth: null },
  ],
  subscriptions: [],
  habitTrend: { isImproving: false, score: 0, message: 'Keep tracking...' },
  goals: [],
  contingency: {
    active: false,
    liquidRunwayDays: 90,
    essentialMonthlySpend: 2500,
  },
  marketTrends: [],
  profile: {
    full_name: 'Test User',
    email: 'test@example.com',
    preferred_currency: 'USD',
    budgeting_enabled: false,
    rollover_start_month: null,
    contingency_mode_active: false,
  },
}

describe('DashboardUI', () => {
  it('renders the sidebar and header', async () => {
    await act(async () => {
      render(<DashboardUI payload={mockPayload} userEmail="test@example.com" />)
    })

    expect(screen.getAllByText('StashFlow').length).toBeGreaterThan(0)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders stat cards with formatted financial values', async () => {
    await act(async () => {
      render(<DashboardUI payload={mockPayload} userEmail="test@example.com" />)
    })

    expect(screen.getByText('Net Worth')).toBeInTheDocument()
    expect(screen.getByText('$10,000.00')).toBeInTheDocument()
    expect(screen.getByText('Monthly Income')).toBeInTheDocument()
  })

  it('renders recent transactions in the history table', async () => {
    await act(async () => {
      render(<DashboardUI payload={mockPayload} userEmail="test@example.com" />)
    })

    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getAllByText('Monthly Rent').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Monthly Salary').length).toBeGreaterThan(0)
  })

  it('renders empty state when no transactions are present', async () => {
    const emptyPayload: DashboardPayload = {
      ...mockPayload,
      recentTransactions: [],
    }

    await act(async () => {
      render(<DashboardUI payload={emptyPayload} userEmail="test@example.com" />)
    })

    expect(screen.getByText(/No matches found/i)).toBeInTheDocument()
  })

  it('renders the financial health card with DTI data', async () => {
    await act(async () => {
      render(<DashboardUI payload={mockPayload} userEmail="test@example.com" />)
    })

    // Click the DTI Ratio sidebar button to switch view
    const dtiButton = screen.getByRole('button', { name: /DTI Ratio/i })
    await act(async () => {
      fireEvent.click(dtiButton)
    })

    expect(screen.getAllByText(/DTI Ratio/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/24/).length).toBeGreaterThan(0)
  })
})

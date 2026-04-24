import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DashboardUI from '@/components/dashboard/DashboardUI'
import { DashboardPayload } from '@stashflow/core'

// Mock the CashFlowChart because it uses SVG and complex refs that are hard to test in JSDOM
vi.mock('@/modules/dashboard/components/trends/CashFlowChart', () => ({
  CashFlowChart: () => <div data-testid="cash-flow-chart" />
}))

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
    { month: 'Apr', income: 5000, expense: 1200 },
  ],
  categoryBreakdown: [
    { category: 'housing', amount: 1200, vsLastMonth: 0 },
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
    global_rollover_enabled: false,
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

  it('renders summary values correctly', async () => {
    await act(async () => {
      render(<DashboardUI payload={mockPayload} userEmail="test@example.com" />)
    })

    expect(screen.getAllByText('NET WORTH').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$10,000.00').length).toBeGreaterThan(0)
  })

  it('renders recent transactions correctly', async () => {
    await act(async () => {
      render(<DashboardUI payload={mockPayload} userEmail="test@example.com" />)
    })

    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getByText('Monthly Rent')).toBeInTheDocument()
    expect(screen.getByText('Monthly Salary')).toBeInTheDocument()
  })

  it('renders the financial health indicators', async () => {
    await act(async () => {
      render(<DashboardUI payload={mockPayload} userEmail="test@example.com" />)
    })

    expect(screen.getByText('DTI RATIO')).toBeInTheDocument()
    expect(screen.getByText('24%')).toBeInTheDocument()
  })
})

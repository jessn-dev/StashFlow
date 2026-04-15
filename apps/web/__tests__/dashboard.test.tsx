import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DashboardUI from '@/components/dashboard/DashboardUI'

// Mock formatCurrency from core to keep output stable if needed, 
// but using real one is fine too if it's pure logic.

describe('DashboardUI', () => {
  const mockSummary = {
    netWorth: 10000,
    totalAssets: 15000,
    totalLiabilities: 5000,
  }

  const mockTransactions = [
    {
      id: '1',
      amount: 1200,
      currency: 'USD',
      date: '2026-04-01',
      type: 'expense' as const,
      category: 'housing' as const,
      description: 'Monthly Rent',
    },
    {
      id: '2',
      amount: 5000,
      currency: 'USD',
      date: '2026-04-01',
      type: 'income' as const,
      source: 'Monthly Salary',
    }
  ]

  it('renders dashboard summary cards with formatted values', async () => {
    await act(async () => {
      render(
        <DashboardUI 
          userEmail="test@example.com"
          summary={mockSummary}
          transactions={mockTransactions}
        />
      )
    })

    expect(await screen.findByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    
    // Check for formatted amounts (formatCurrency adds commas and .00 by default)
    expect(screen.getByText('$10,000.00')).toBeInTheDocument()
    expect(screen.getByText('$15,000.00')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
  })

  it('renders the transactions table when data is present', async () => {
    await act(async () => {
      render(
        <DashboardUI 
          userEmail="test@example.com"
          summary={mockSummary}
          transactions={mockTransactions}
        />
      )
    })

    expect(await screen.findByText('Recent Transactions')).toBeInTheDocument()
    expect(screen.getByText('Monthly Rent')).toBeInTheDocument()
    expect(screen.getByText('Monthly Salary')).toBeInTheDocument()
    
    // Check amounts with signs
    expect(screen.getByText('-$1,200.00')).toBeInTheDocument()
    expect(screen.getByText('+$5,000.00')).toBeInTheDocument()
  })

  it('shows empty state when no transactions are found', async () => {
    await act(async () => {
      render(
        <DashboardUI 
          userEmail="test@example.com"
          summary={mockSummary}
          transactions={[]}
        />
      )
    })

    expect(await screen.findByText(/No data available/i)).toBeInTheDocument()
    expect(screen.getByText(/You haven't added any transactions yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add Transaction/i })).toBeInTheDocument()
  })
})

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExpenseForm from '@/components/spending/ExpenseForm'
import CategoryBreakdown from '@/components/spending/CategoryBreakdown'
import { addExpense } from '@/app/dashboard/spending/actions'

// Mock the server action
vi.mock('@/app/dashboard/spending/actions', () => ({
  addExpense: vi.fn(),
}))

describe('Spending Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ExpenseForm', () => {
    it('renders the form correctly', async () => {
      await act(async () => {
        render(<ExpenseForm />)
      })
      expect(await screen.findByText('Log New Expense')).toBeInTheDocument()
      expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
    })

    it('submits the form and shows success message', async () => {
      vi.mocked(addExpense).mockResolvedValue({ success: true })
      
      await act(async () => {
        render(<ExpenseForm />)
      })
      
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } })
      fireEvent.change(screen.getByPlaceholderText('e.g. Weekly Groceries'), { target: { value: 'Test Grocery' } })
      
      const submitButton = screen.getByRole('button', { name: /Add Expense/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(addExpense).toHaveBeenCalled()
      expect(await screen.findByText(/Expense added successfully/i)).toBeInTheDocument()
    })

    it('shows error message on failure', async () => {
      vi.mocked(addExpense).mockResolvedValue({ error: 'Failed to create' })
      
      await act(async () => {
        render(<ExpenseForm />)
      })
      
      const submitButton = screen.getByRole('button', { name: /Add Expense/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(await screen.findByText(/Failed to create/i)).toBeInTheDocument()
    })
  })

  describe('CategoryBreakdown', () => {
    const mockData = [
      { category: 'food', amount: 300 },
      { category: 'housing', amount: 700 },
    ]

    it('renders the breakdown correctly', async () => {
      await act(async () => {
        render(<CategoryBreakdown data={mockData} />)
      })
      
      expect(await screen.findByText('Spending Breakdown')).toBeInTheDocument()
      expect(screen.getByText(/food/i)).toBeInTheDocument()
      expect(screen.getByText(/housing/i)).toBeInTheDocument()
      
      // Check for total (using formatCurrency mock behavior or real one)
      expect(screen.getByText('$1,000.00')).toBeInTheDocument()
      
      // Check percentages
      expect(screen.getByText(/30.0%/)).toBeInTheDocument()
      expect(screen.getByText(/70.0%/)).toBeInTheDocument()
    })

    it('shows empty state when no data', async () => {
      await act(async () => {
        render(<CategoryBreakdown data={[]} />)
      })
      expect(await screen.findByText(/No data to display/i)).toBeInTheDocument()
    })
  })
})

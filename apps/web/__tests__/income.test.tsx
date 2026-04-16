import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import IncomeForm from '@/components/income/IncomeForm'
import { addIncome } from '@/app/dashboard/income/actions'

// Mock the server action
vi.mock('@/app/dashboard/income/actions', () => ({
  addIncome: vi.fn(),
  removeIncome: vi.fn(),
}))

describe('Income Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('IncomeForm', () => {
    it('renders the form correctly', async () => {
      await act(async () => {
        render(<IncomeForm />)
      })
      expect(await screen.findByText('Log New Income')).toBeInTheDocument()
      expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Source/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Frequency/i)).toBeInTheDocument()
    })

    it('submits the form and shows success message', async () => {
      vi.mocked(addIncome).mockResolvedValue({ success: true })
      
      await act(async () => {
        render(<IncomeForm />)
      })
      
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } })
      fireEvent.change(screen.getByPlaceholderText('e.g. Monthly Salary'), { target: { value: 'Job' } })
      
      const submitButton = screen.getByRole('button', { name: /Add Income/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(addIncome).toHaveBeenCalled()
      expect(await screen.findByText(/Income added successfully/i)).toBeInTheDocument()
    })

    it('shows error message on failure', async () => {
      vi.mocked(addIncome).mockResolvedValue({ error: 'Failed to create' })
      
      await act(async () => {
        render(<IncomeForm />)
      })
      
      const submitButton = screen.getByRole('button', { name: /Add Income/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(await screen.findByText(/Failed to create/i)).toBeInTheDocument()
    })
  })
})

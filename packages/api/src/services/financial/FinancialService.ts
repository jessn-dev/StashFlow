import { SupabaseClient } from '@supabase/supabase-js'
import { 
  Database, 
  Loan, 
  LoanPayment,
  generateInstallmentSchedule,
  convertToBase,
  RateMap
} from '@stashflow/core'

/**
 * FinancialService: Manages core financial records (Incomes, Expenses, Loans).
 * Decoupled from specific views/UI.
 */
export class FinancialService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ── Loans ──────────────────────────────────────────────────────────────────

  async getLoans(): Promise<Loan[]> {
    const { data, error } = await this.supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async createLoan(loanData: any) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const schedule = generateInstallmentSchedule({
      principal: loanData.principal,
      annualRate: loanData.interest_rate,
      durationMonths: loanData.duration_months,
      startDate: loanData.start_date,
      interestType: loanData.interest_type,
      interestBasis: loanData.interest_basis
    })

    const installmentAmount = schedule[0]?.total ?? 0
    const endDate = schedule[schedule.length - 1]?.dueDate || loanData.start_date

    const { data: loan, error } = await this.supabase
      .from('loans')
      .insert({
        user_id: user.id,
        ...loanData,
        installment_amount: installmentAmount,
        end_date: endDate,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error

    const payments = schedule.map(inst => ({
      user_id: user.id,
      loan_id: loan.id,
      due_date: inst.dueDate,
      amount_paid: inst.total,
      status: 'pending' as const
    }))

    await this.supabase.from('loan_payments').insert(payments)
    return loan
  }

  async deleteLoan(id: string) {
    const { error } = await this.supabase.from('loans').delete().eq('id', id)
    if (error) throw error
  }

  // ── Expenses ───────────────────────────────────────────────────────────────

  async getExpenses(limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  }

  async createExpense(expense: any) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')
    const { data, error } = await this.supabase
      .from('expenses')
      .insert({ ...expense, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

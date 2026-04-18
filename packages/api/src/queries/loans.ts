import { SupabaseClient } from '@supabase/supabase-js'
import { 
  Database, 
  generateInstallmentSchedule, 
  Loan, 
  LoanPayment,
  LoanInterestType,
  LoanInterestBasis,
  LoanCommercialCategory
} from '@stashflow/core'

/**
 * Fetch all loans for the authenticated user
 */
export async function getLoans(supabase: SupabaseClient<Database>): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * Fetch a single loan with its payments
 */
export async function getLoan(supabase: SupabaseClient<Database>, id: string): Promise<Loan> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

/**
 * Create a new loan and generate its installment schedule
 */
export async function createLoan(
  supabase: SupabaseClient<Database>,
  loanData: {
    name: string
    principal: number
    currency: string
    interest_rate: number
    duration_months: number
    start_date: string
    lender?: string
    country_code?: string
    commercial_category?: LoanCommercialCategory
    interest_type?: LoanInterestType
    interest_basis?: LoanInterestBasis
    payment_start_date?: string
  }
) {
  // 1. Get user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Generate schedule to get installment amount and end date
  const schedule = generateInstallmentSchedule({
    principal: loanData.principal,
    annualRate: loanData.interest_rate,
    durationMonths: loanData.duration_months,
    startDate: loanData.start_date,
    paymentStartDate: loanData.payment_start_date,
    interestType: loanData.interest_type,
    interestBasis: loanData.interest_basis
  })
  
  const installmentAmount = schedule[0]?.total ?? 0
  const endDate = schedule[schedule.length - 1]?.dueDate || loanData.start_date

  // 3. Insert Loan
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert({
      user_id: user.id,
      name: loanData.name,
      principal: loanData.principal,
      currency: loanData.currency,
      interest_rate: loanData.interest_rate,
      duration_months: loanData.duration_months,
      start_date: loanData.start_date,
      installment_amount: installmentAmount,
      end_date: endDate,
      status: 'active',
      lender: loanData.lender || null,
      country_code: loanData.country_code || 'US',
      commercial_category: loanData.commercial_category || 'Personal / Cash',
      interest_type: loanData.interest_type || 'Standard Amortized',
      interest_basis: loanData.interest_basis || 'Actual/365',
      payment_start_date: loanData.payment_start_date || loanData.start_date
    })
    .select()
    .single()

  if (loanError) throw loanError

  // 4. Insert Installment Schedule
  const payments = schedule.map((inst, idx) => ({
    user_id: user.id,
    loan_id: loan.id,
    due_date: inst.dueDate,
    amount_paid: inst.total, // amount_paid is used as amount_due for pending
    status: 'pending' as const
  }))

  const { error: paymentsError } = await supabase
    .from('loan_payments')
    .insert(payments)

  if (paymentsError) throw paymentsError

  return loan
}

/**
 * Delete a loan and its associated payments
 */
export async function deleteLoan(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

/**
 * Fetch all payments for a specific loan
 */
export async function getLoanPayments(
  supabase: SupabaseClient<Database>,
  loanId: string
): Promise<LoanPayment[]> {
  const { data, error } = await supabase
    .from('loan_payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('due_date', { ascending: true })
  
  if (error) throw error
  return data
}

/**
 * Toggle payment status (paid/pending)
 */
export async function togglePaymentStatus(
  supabase: SupabaseClient<Database>,
  paymentId: string,
  currentStatus: string,
  loanId: string
) {
  const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'
  const paidDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null

  const { error } = await supabase
    .from('loan_payments')
    .update({ 
      status: newStatus,
      paid_date: paidDate
    })
    .eq('id', paymentId)

  if (error) throw error

  // Check if ALL payments are now paid to mark loan as 'completed'
  const { data: allPayments } = await supabase
    .from('loan_payments')
    .select('status')
    .eq('loan_id', loanId)

  const isCompleted = allPayments && allPayments.length > 0 && allPayments.every(p => p.status === 'paid')

  const loanUpdate: Database['public']['Tables']['loans']['Update'] = isCompleted 
    ? { status: 'completed', completed_at: new Date().toISOString() }
    : { status: 'active', completed_at: null }

  await supabase.from('loans').update(loanUpdate).eq('id', loanId)
}

/**
 * Mark all payments for a loan as paid
 */
export async function markAllPaid(supabase: SupabaseClient<Database>, loanId: string) {
  const now = new Date().toISOString()
  const paidDate = now.split('T')[0]
  
  const { error } = await supabase
    .from('loan_payments')
    .update({ status: 'paid', paid_date: paidDate })
    .eq('loan_id', loanId)

  if (error) throw error
  
  const loanUpdate: Database['public']['Tables']['loans']['Update'] = { 
    status: 'completed', 
    completed_at: now 
  }

  const { error: loanError } = await supabase
    .from('loans')
    .update(loanUpdate)
    .eq('id', loanId)

  if (loanError) throw loanError
}

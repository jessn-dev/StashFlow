import { SupabaseClient } from '@supabase/supabase-js'
import { Database, calculateDTIRatio } from '@stashflow/core'

export interface DTIResult {
  ratio: number
  status: 'low' | 'medium' | 'high'
  color: string
  gross_income: number
  total_debt: number
  currency: string
  recommendation: string
  breakdown: {
    income_sources: number
    active_loans: number
  }
}

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':   return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'yearly':   return amount / 12
    case 'one-time': return amount / 12
    default:         return amount
  }
}

/**
 * Computes the user's Debt-to-Income ratio from direct Supabase queries.
 * No Edge Function required.
 */
export async function getDTIRatio(
  supabase: SupabaseClient<Database>
): Promise<DTIResult> {
  const [
    { data: incomeRows },
    { data: loanRows },
  ] = await Promise.all([
    supabase.from('incomes').select('amount, frequency'),
    supabase.from('loans').select('installment_amount, currency').eq('status', 'active'),
  ])

  const monthlyIncome = (incomeRows ?? []).reduce((s, r) => s + toMonthly(r.amount, r.frequency ?? 'monthly'), 0)
  const monthlyDebt   = (loanRows ?? []).reduce((s, r) => s + r.installment_amount, 0)
  const result        = calculateDTIRatio(monthlyIncome, monthlyDebt)
  const currency      = loanRows?.[0]?.currency ?? 'USD'

  const recommendation =
    result.status === 'low'    ? 'Your DTI is healthy — keep it up!'
    : result.status === 'medium' ? 'Consider paying down debt before taking on more.'
    : 'High DTI detected. Prioritise debt reduction now.'

  return {
    ratio:          Math.round(result.ratio),
    status:         result.status,
    color:          result.color,
    gross_income:   monthlyIncome,
    total_debt:     monthlyDebt,
    currency,
    recommendation,
    breakdown: {
      income_sources: (incomeRows ?? []).length,
      active_loans:   (loanRows ?? []).length,
    },
  }
}

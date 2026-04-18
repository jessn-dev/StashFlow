import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@stashflow/core'

export interface CashFlowProjection {
  period: string
  month: string
  income: number
  expenses: number
  debt: number
  net: number
}

export interface CashFlowPayload {
  currency: string
  projections: CashFlowProjection[]
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
 * Builds a 12-month forward cash flow projection from direct Supabase queries.
 * Income is normalised to a monthly cadence using each source's frequency.
 * Debt is the sum of active loan installment amounts.
 * Expenses are projected as the 3-month rolling average.
 * No Edge Function required.
 */
export async function getCashFlowProjections(
  supabase: SupabaseClient<Database>
): Promise<CashFlowPayload> {
  const now = new Date()
  const pad    = (n: number) => String(n).padStart(2, '0')
  const ymStr  = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

  // Last 3 months of expenses for average
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const threeMonthsAgoStr = `${ymStr(threeMonthsAgo)}-01`

  const [
    { data: incomeRows },
    { data: loanRows   },
    { data: recentExp  },
  ] = await Promise.all([
    supabase.from('incomes').select('amount, frequency, currency'),
    supabase.from('loans').select('installment_amount, currency, end_date').eq('status', 'active'),
    supabase.from('expenses').select('amount').gte('date', threeMonthsAgoStr),
  ])

  const currency      = incomeRows?.[0]?.currency ?? loanRows?.[0]?.currency ?? 'USD'
  const monthlyIncome = (incomeRows ?? []).reduce((s, r) => s + toMonthly(r.amount, r.frequency ?? 'monthly'), 0)
  const monthlyDebt   = (loanRows ?? []).reduce((s, r) => s + r.installment_amount, 0)
  const avgMonthlyExp = (recentExp ?? []).reduce((s, r) => s + r.amount, 0) / 3

  // Build 12-month forward projection
  const projections: CashFlowProjection[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const period = ymStr(d)
    const month  = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })

    // Debt: exclude loans that will have ended by this month
    const activeDebtThisMonth = (loanRows ?? [])
      .filter(l => !l.end_date || l.end_date >= `${period}-01`)
      .reduce((s, l) => s + l.installment_amount, 0)

    const net = monthlyIncome - avgMonthlyExp - activeDebtThisMonth
    projections.push({
      period,
      month,
      income:   Math.round(monthlyIncome),
      expenses: Math.round(avgMonthlyExp),
      debt:     Math.round(activeDebtThisMonth),
      net:      Math.round(net),
    })
  }

  return { currency, projections }
}

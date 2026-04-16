import { SupabaseClient } from '@supabase/supabase-js'
import { Database, DashboardSummary, Transaction } from '@stashflow/core'

/**
 * Fetches the user's financial summary for the dashboard.
 *
 * MVP NOTE — "Total Assets" currently equals the sum of all income records
 * (i.e. total income ever received). This is an intentional placeholder until
 * a dedicated accounts/assets table is added in a future milestone. The UI
 * label should reflect this limitation ("Total Income") until then.
 *
 * TODO (M5+): Replace income-sum with a proper asset balance query once the
 * accounts table exists. Replace loan-principal with outstanding balance from
 * loan_payments to account for partial repayments.
 *
 * BACKLOG (performance): As data grows, add a date-range filter so this query
 * does not aggregate all-time records on every dashboard load.
 */
export async function getDashboardSummary(
  supabase: SupabaseClient<Database>
): Promise<DashboardSummary> {
  const [{ data: incomes, error: incomeError }, { data: loans, error: loanError }] =
    await Promise.all([
      supabase.from('incomes').select('amount'),
      supabase.from('loans').select('principal').eq('status', 'active'),
    ])

  if (incomeError) throw incomeError
  if (loanError) throw loanError

  const totalAssets = (incomes ?? []).reduce((sum, item) => sum + item.amount, 0)
  const totalLiabilities = (loans ?? []).reduce((sum, item) => sum + item.principal, 0)
  const netWorth = totalAssets - totalLiabilities

  return { netWorth, totalAssets, totalLiabilities }
}

/**
 * Fetches the 5 most recent transactions (incomes and expenses combined).
 *
 * BACKLOG (performance): This makes two separate DB round-trips and merges
 * in JS. For scale, replace with a Postgres VIEW that UNIONs both tables,
 * queryable via a single Supabase RPC call.
 */
export async function getRecentTransactions(
  supabase: SupabaseClient<Database>
): Promise<Transaction[]> {
  const [
    { data: incomeData, error: incomeError },
    { data: expenseData, error: expenseError },
  ] = await Promise.all([
    supabase.from('incomes').select('*').order('date', { ascending: false }).limit(5),
    supabase.from('expenses').select('*').order('date', { ascending: false }).limit(5),
  ])

  if (incomeError) throw incomeError
  if (expenseError) throw expenseError

  const combined: Transaction[] = [
    ...(incomeData ?? []).map(i => ({
      id: i.id,
      amount: i.amount,
      currency: i.currency,
      date: i.date,
      type: 'income' as const,
      source: i.source,
      notes: i.notes,
    })),
    ...(expenseData ?? []).map(e => ({
      id: e.id,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
      type: 'expense' as const,
      category: e.category,
      description: e.description,
      notes: e.notes,
    })),
  ]

  return combined
    .toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
}

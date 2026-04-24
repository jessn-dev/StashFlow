import { SupabaseClient } from '@supabase/supabase-js'
import { Database, DashboardSummary, Transaction, calculateDTIRatio, BudgetRecommendation } from '@stashflow/core'
import { fetchRateMap, convertCurrency, RateMap } from './exchange-rates'
import { getSmartBudgetRecommendation } from './budgets'
import { detectSubscriptions } from './expenses'

// ── Helpers ────────────────────────────────────────────────────────────────────
function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':   return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'yearly':   return amount / 12
    case 'one-time': return amount / 12
    default:         return amount // 'monthly'
  }
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

// ── Type ──────────────────────────────────────────────────────────────────────
export interface DashboardPayload {
  isNewUser: boolean
  summary: DashboardSummary & {
    currency: string
    thisMonth: {
      income: number
      expense: number
      growth: number
    }
    budget: {
      enabled: boolean
      totalBudgeted: number
      totalSpent: number
      totalRollover: number
      freeToSpend: number
    }
  }
  dti: {
    ratio: number
    status: 'low' | 'medium' | 'high'
    color: string
    gross_income: number
    total_debt: number
    housing_debt: number
    front_end_ratio: number
    currency: string
    recommendation: string
    breakdown: {
      income_sources: number
      active_loans: number
    }
  }
  contingency: {
    active: boolean
    liquidRunwayDays: number
    essentialMonthlySpend: number
  }
  marketTrends: Array<{
    name: string
    category: string | null
    inflationRate: number
    status: 'up' | 'down' | 'stable'
  }>
  recentTransactions: Transaction[]
  trend: {
    month: string
    income: number
    expense: number
  }[]
  categoryBreakdown: {
    category: string
    amount: number
    vsLastMonth: number | null
  }[]
  budgetRecommendation?: BudgetRecommendation
  subscriptions: any[]
  habitTrend?: {
    isImproving: boolean
    score: number
    message: string
  }
  goals: {
    id: string
    name: string
    progress: number
    target: number
    current: number
    type: 'savings' | 'debt'
    deadline: string | null
  }[]
  profile: {
    full_name: string | null
    email: string
    preferred_currency: string
    budgeting_enabled: boolean
    global_rollover_enabled: boolean
    rollover_start_month: string | null
  }
}

// ── Main function (no Edge Function required) ─────────────────────────────────
export async function getDashboardPayload(
  supabase: SupabaseClient<Database>
): Promise<DashboardPayload> {
  const now = new Date()

  // Date helpers
  const pad    = (n: number) => String(n).padStart(2, '0')
  const ymStr  = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

  const thisMonthStart    = `${ymStr(now)}-01`
  const lastMonthDate     = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStart    = `${ymStr(lastMonthDate)}-01`
  const lastMonthEnd      = `${ymStr(lastMonthDate)}-${pad(
    new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  )}`
  const sixMonthsAgoStart = `${ymStr(new Date(now.getFullYear(), now.getMonth() - 5, 1))}-01`

  // ── Parallel queries (core tables only) ─────────────────────────────────────
  const [
    { data: allIncomes   },
    { data: activeLoans  },
    { data: pendingPayments },
    { data: thisMonthExp },  // includes category for breakdown
    { data: lastMonthExp },
    { data: recentInc    },
    { data: recentExp    },
    { data: trendExp     },
    { data: profile      },
    { data: categoryMeta },
    { data: rawTrends    },
    rates,
    budgetRec,
  ] = await Promise.all([
    supabase.from('incomes').select('amount, frequency, date, currency'),
    supabase.from('loans')
      .select('id, principal, installment_amount, currency, name')
      .eq('status', 'active'),
    supabase.from('loan_payments').select('loan_id, amount_paid, status').eq('status', 'pending'),
    supabase.from('expenses').select('amount, category, currency').gte('date', thisMonthStart),
    supabase.from('expenses').select('amount, category, currency').gte('date', lastMonthStart).lte('date', lastMonthEnd),
    supabase.from('incomes').select('*').order('date', { ascending: false }).limit(10),
    supabase.from('expenses').select('*').order('date', { ascending: false }).limit(10),
    supabase.from('expenses').select('amount, date, currency').gte('date', sixMonthsAgoStart),
    supabase.from('profiles').select('full_name, email, preferred_currency, budgeting_enabled, rollover_start_month, contingency_mode_active').single(),
    supabase.from('category_metadata').select('category, is_essential'),
    supabase.from('market_trends').select('*').order('period', { ascending: false }),
    fetchRateMap(supabase).catch((): RateMap => ({})),
    getSmartBudgetRecommendation(supabase).catch(() => undefined),
  ])

  // ── Goals (optional table — may not exist yet) ───────────────────────────────
  let goalsData: Array<{
    id: string; name: string; target_amount: number; current_amount: number
    type: string; deadline: string | null; currency: string
  }> = []
  try {
    const sb = supabase as any
    const { data, error } = await sb.from('goals')
      .select('id, name, target_amount, current_amount, type, deadline, currency')
      .order('created_at', { ascending: false })
    if (!error && Array.isArray(data)) goalsData = data
  } catch { /* table may not exist yet */ }

  // ── Budget summary (optional table) ─────────────────────────────────────────
  let budgetEnabled    = false
  let totalBudgeted    = 0
  let totalRollover    = 0
  try {
    const sb = supabase as any
    const period = ymStr(now)
    const [{ data: budgets }, { data: periods }] = await Promise.all([
      sb.from('budgets').select('amount, category'),
      sb.from('budget_periods').select('budgeted, spent, rolled_over_amount').eq('period', period),
    ])
    // Use the DB profile value as the source of truth
    if (profile?.budgeting_enabled) budgetEnabled = true
    if (Array.isArray(budgets) && budgets.length > 0) {
      budgetEnabled = true
      totalBudgeted = budgets.reduce((s: number, b: any) => s + (b.amount ?? 0), 0)
    }
    if (Array.isArray(periods)) {
      totalRollover = periods.reduce((s: number, p: any) => s + (p.rolled_over_amount ?? 0), 0)
    }
  } catch { /* optional */ }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const allInc  = allIncomes ?? []
  const actLoan = activeLoans ?? []
  const currency = profile?.preferred_currency ?? 'USD'
  const rateMap  = rates ?? {}

  const conv = (amount: number, from: string | null) =>
    convertCurrency(amount, from ?? 'USD', currency, rateMap)

  // Redefine Assets as the sum of current progress in goals (what you actually HAVE/SAVED)
  const totalAssets      = goalsData.reduce((s, g) => s + conv(g.current_amount, (g as any).currency || 'USD'), 0)
  
  // FIXED: totalLiabilities should be the sum of remaining payments, not original principal
  let totalLiabilities = 0
  actLoan.forEach(loan => {
    const loanPending = (pendingPayments ?? []).filter(p => p.loan_id === loan.id)
    totalLiabilities += loanPending.reduce((s, p) => s + conv(p.amount_paid || loan.installment_amount, loan.currency), 0)
  })

  const netWorth         = totalAssets - totalLiabilities

  const thisMonthIncomeAmt  = allInc
    .filter(r => r.date >= thisMonthStart)
    .reduce((s, r) => s + conv(r.amount, r.currency), 0)
  const thisMonthExpenseAmt = (thisMonthExp ?? []).reduce((s, r) => s + conv(r.amount, r.currency ?? null), 0)
  const lastMonthExpenseAmt = (lastMonthExp ?? []).reduce((s, r) => s + conv(r.amount, r.currency ?? null), 0)
  const growth = lastMonthExpenseAmt > 0
    ? ((thisMonthExpenseAmt - lastMonthExpenseAmt) / lastMonthExpenseAmt) * 100
    : 0

  // ── DTI ─────────────────────────────────────────────────────────────────────
  const monthlyIncome = allInc.reduce((s, r) => s + conv(toMonthly(r.amount, r.frequency ?? 'monthly'), r.currency), 0)
  const monthlyDebt   = actLoan.reduce((s, r) => s + conv(r.installment_amount, r.currency), 0)
  const dtiResult     = calculateDTIRatio(monthlyIncome, monthlyDebt, currency)
  const dtiCurrency   = currency
  const dtiRec        =
    dtiResult.status === 'low'    ? 'Your DTI is healthy — keep it up!'
    : dtiResult.status === 'medium' ? 'Consider paying down debt before taking on more.'
    : 'High DTI detected. Prioritise debt reduction now.'

  // Housing debt: loans whose name contains common housing keywords
  const housingKeywords = /mortgage|housing|rent|home|property/i
  const housingDebt = actLoan
    .filter(l => housingKeywords.test(l.name ?? ''))
    .reduce((s, l) => s + conv(l.installment_amount, l.currency), 0)
  const frontEndRatio = monthlyIncome > 0 ? (housingDebt / monthlyIncome) * 100 : 0

  // ── 6-month trend ───────────────────────────
  const trend: DashboardPayload['trend'] = []
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym    = ymStr(d)
    const label = d.toLocaleString('en-US', { month: 'short' })
    const incomeSum  = allInc.filter(r => monthKey(r.date) === ym).reduce((s, r) => s + conv(r.amount, r.currency), 0)
    const expenseSum = (trendExp ?? []).filter(r => monthKey(r.date) === ym).reduce((s, r) => s + conv(r.amount, r.currency ?? null), 0)
    trend.push({ month: label, income: incomeSum, expense: expenseSum })
  }

  // ── Category breakdown (this month + vs last month) ─────────────────────────
  const catMap: Record<string, number> = {}
  ;(thisMonthExp ?? []).forEach(e => {
    const cat = e.category ?? 'other'
    catMap[cat] = (catMap[cat] ?? 0) + conv(e.amount, e.currency ?? null)
  })
  const lastCatMap: Record<string, number> = {}
  ;(lastMonthExp ?? []).forEach((e: any) => {
    const cat = e.category ?? 'other'
    lastCatMap[cat] = (lastCatMap[cat] ?? 0) + conv(e.amount, e.currency ?? null)
  })
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, amount]) => {
      const prev = lastCatMap[category] ?? 0
      const vsLastMonth = prev > 0 ? Math.round(((amount - prev) / prev) * 100) : null
      return { category, amount, vsLastMonth }
    })
    .sort((a, b) => b.amount - a.amount)

  // ── Subscription Detection ──────────────────────────────────────────────────
  const subscriptions = detectSubscriptions(recentExp ?? [])

  // ── Habit Trend Analysis ────────────────────────────────────────────────────
  let isImproving = false
  let improvementScore = 0
  if (trend.length >= 3) {
    const latest = trend[trend.length - 1].expense
    const mid = trend[trend.length - 2].expense
    const old = trend[trend.length - 3].expense
    
    // Improvement means latest < mid < old
    if (latest < mid && mid < old && old > 0) {
      isImproving = true
      improvementScore = Math.round(((old - latest) / old) * 100)
    }
  }

  const habitTrend = {
    isImproving,
    score: improvementScore,
    message: isImproving 
      ? `Great job! Your monthly spending has decreased by ${improvementScore}% over the last 3 months.`
      : "Keep tracking your expenses to unlock habit insights."
  }

  // ── Recent transactions ──────────────────────────────────────────────────────
  const recentTransactions: Transaction[] = [
    ...(recentInc ?? []).map(i => ({
      id: i.id, amount: conv(i.amount, i.currency), currency: currency,
      date: i.date, type: 'income' as const,
      source: i.source, notes: i.notes ?? undefined,
    })),
    ...(recentExp ?? []).map(e => ({
      id: e.id, amount: conv(e.amount, e.currency), currency: currency,
      date: e.date, type: 'expense' as const,
      category: e.category ?? undefined,
      description: e.description ?? undefined,
      notes: e.notes ?? undefined,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  // ── Goals ────────────────────────────────────────────────────────────────────
  const goals: DashboardPayload['goals'] = goalsData.map(g => ({
    id:       g.id,
    name:     g.name,
    target:   g.target_amount,
    current:  g.current_amount,
    progress: g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0,
    type:     (g.type ?? 'savings') === 'debt' ? 'debt' : 'savings' as 'savings' | 'debt',
    deadline: g.deadline ?? null,
  }))

  // ── Contingency Engine ───────────────────────────────────────────────────────
  const essentialCats = new Set((categoryMeta ?? []).filter((m: any) => m.is_essential).map((m: any) => m.category))
  // If no meta, fallback to hardcoded essentials
  if (essentialCats.size === 0) {
    ['housing', 'utilities', 'food'].forEach(c => essentialCats.add(c))
  }

  const essentialMonthlySpend = actLoan.reduce((s, l) => s + conv(l.installment_amount, l.currency), 0) +
    (thisMonthExp ?? [])
      .filter(e => essentialCats.has(e.category as any))
      .reduce((s, e) => s + conv(e.amount, e.currency ?? null), 0)

  const runwayDays = essentialMonthlySpend > 0 
    ? Math.floor((totalAssets / (essentialMonthlySpend / 30))) 
    : 999

  // ── Market Intelligence ─────────────────────────────────────────────────────
  const marketTrends: DashboardPayload['marketTrends'] = []
  const seriesGroups: Record<string, any[]> = {}
  ;(rawTrends ?? []).forEach((t: any) => {
    if (!seriesGroups[t.series_id]) seriesGroups[t.series_id] = []
    seriesGroups[t.series_id].push(t)
  })

  Object.values(seriesGroups).forEach(group => {
    if (group.length >= 2) {
      const latest = group[0]
      const previous = group[1]
      const inflation = ((latest.value - previous.value) / previous.value) * 100
      marketTrends.push({
        name: latest.series_name,
        category: latest.category,
        currency: latest.currency || 'USD',
        inflationRate: parseFloat(inflation.toFixed(2)),
        status: inflation > 0.1 ? 'up' : inflation < -0.1 ? 'down' : 'stable'
      } as any)
    }
  })

  // ── Return ───────────────────────────────────────────────────────────────────
  return {
    isNewUser: !profile?.preferred_currency,
    summary: {
      netWorth,
      totalAssets,
      totalLiabilities,
      currency,
      thisMonth: { income: thisMonthIncomeAmt, expense: thisMonthExpenseAmt, growth },
      budget: {
        enabled:      budgetEnabled,
        totalBudgeted,
        totalSpent:   thisMonthExpenseAmt,
        totalRollover,
        freeToSpend:  Math.max(0, totalBudgeted + totalRollover - thisMonthExpenseAmt),
      },
    },
    contingency: {
      active: !!(profile as any)?.contingency_mode_active,
      liquidRunwayDays: runwayDays,
      essentialMonthlySpend: essentialMonthlySpend,
    },
    marketTrends,
    dti: {
      ratio:          Math.round(dtiResult.ratio),
      status:         dtiResult.status,
      color:          dtiResult.color,
      gross_income:   monthlyIncome,
      total_debt:     monthlyDebt,
      housing_debt:   housingDebt,
      front_end_ratio: Math.round(frontEndRatio),
      currency:       dtiCurrency,
      recommendation: dtiRec,
      breakdown: {
        income_sources: allInc.length,
        active_loans:   actLoan.length,
      },
    },
    recentTransactions,
    trend,
    categoryBreakdown,
    budgetRecommendation: budgetRec,
    subscriptions,
    habitTrend,
    goals,
    profile: {
      full_name:               profile?.full_name ?? null,
      email:                   profile?.email ?? '',
      preferred_currency:      profile?.preferred_currency ?? 'USD',
      budgeting_enabled:       profile?.budgeting_enabled ?? budgetEnabled,
      global_rollover_enabled: (profile?.rollover_start_month ?? null) !== null,
      rollover_start_month:    profile?.rollover_start_month ?? null,
      contingency_mode_active: !!(profile as any)?.contingency_mode_active,
    },
  } as any
}

// ── Legacy helpers ────────────────────────────────────────────────────────────
export async function getDashboardSummary(
  supabase: SupabaseClient<Database>
): Promise<DashboardSummary> {
  const { summary } = await getDashboardPayload(supabase)
  return summary
}

export async function getRecentTransactions(
  supabase: SupabaseClient<Database>
): Promise<Transaction[]> {
  const { recentTransactions } = await getDashboardPayload(supabase)
  return recentTransactions
}

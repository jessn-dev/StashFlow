import { 
  Income, 
  Expense, 
  Loan, 
  LoanPayment, 
  Profile, 
  ExchangeRate,
  DashboardPayload,
  CategoryMetadata,
  RateMap,
  Transaction
} from '../schema'
import { convertToBase } from '../math/currency'
import { calculateDTIRatio } from '../math/dti'
import { getRegionalStrategy } from '../regional'
import { generateSmartBudget, MacroEconomicIndicator } from './budget'

export interface AggregationInputs {
  profile: Profile | null
  incomes: Income[]
  expenses: Expense[]
  loans: Loan[]
  payments: LoanPayment[]
  rates: ExchangeRate[]
  trends: any[]
  goals: any[]
  categoryMeta: CategoryMetadata[]
  recentInc?: Income[]
  recentExp?: Expense[]
}

/**
 * Pure function to aggregate raw DB data into a DashboardPayload.
 * Decoupled from Supabase/Network.
 */
export function aggregateDashboardData(inputs: AggregationInputs): DashboardPayload {
  const { 
    profile, incomes, expenses, loans, payments, 
    rates, trends, goals, categoryMeta,
    recentInc, recentExp
  } = inputs
  
  const now = new Date()
  const ymStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const currentPeriod = ymStr(now)
  const thisMonthStart = `${currentPeriod}-01`

  const baseCurrency = profile?.preferred_currency || 'USD'
  const strategy = getRegionalStrategy(baseCurrency)

  // 1. Setup Rate Map
  const rateMap: RateMap = {}
  if (Array.isArray(rates)) {
    rates.filter(Boolean).forEach(r => { rateMap[`${r.base}_${r.target}`] = Number(r.rate) })
  }

  const conv = (amt: number, from: string | null) => convertToBase(amt, from || 'USD', baseCurrency, rateMap)

  // 2. DTI Analysis
  let monthlyIncome = 0
  if (Array.isArray(incomes)) {
    incomes.filter(Boolean).forEach(inc => {
      const baseAmt = conv(Number(inc.amount), inc.currency)
      // Apply regional haircuts (e.g. SGD bonus rules)
      monthlyIncome += strategy.applyIncomeHaircut(inc.source || '', baseAmt)
    })
  }

  const activeLoans = (loans || []).filter(Boolean).filter(l => l.status === 'active')
  const monthlyDebt = activeLoans.reduce((s, l) => s + conv(Number(l.installment_amount), l.currency), 0)
  
  const dtiResult = calculateDTIRatio(monthlyIncome, monthlyDebt, baseCurrency)

  // 3. Liabilities (Remaining Balance)
  let totalLiabilities = 0
  activeLoans.forEach(loan => {
    const loanPending = (payments || []).filter(Boolean).filter(p => p.loan_id === loan.id && (p.status === 'pending' || p.status === 'overdue'))
    totalLiabilities += loanPending.reduce((s, p) => s + conv(p.amount_paid || loan.installment_amount, loan.currency), 0)
  })

  // 4. Asset Summary (Strictly Goals for now)
  const totalAssets = (goals || []).filter(Boolean).reduce((s, g) => s + conv(Number(g.current_amount), g.currency), 0)

  // 5. This Month Performance
  const thisMonthIncomeAmt = (incomes || [])
    .filter(Boolean)
    .filter(r => r.date >= thisMonthStart)
    .reduce((s, r) => s + conv(r.amount, r.currency), 0)
  
  const thisMonthExp = (expenses || []).filter(Boolean).filter(e => e.date >= thisMonthStart)
  const thisMonthExpenseAmt = thisMonthExp.reduce((s, r) => s + conv(r.amount, r.currency), 0)

  // 6. Smart Budget
  const budgetRec = generateSmartBudget(
    monthlyIncome,
    monthlyDebt,
    dtiResult.status,
    {}, // Rolling averages...
    undefined,
    baseCurrency
  )

  // 7. Recent Transactions
  const recentTransactions: Transaction[] = [
    ...(recentInc || []).filter(Boolean).map(i => ({
      id: i.id, amount: conv(i.amount, i.currency), currency: baseCurrency,
      date: i.date, type: 'income' as const,
      source: i.source || undefined, notes: i.notes ?? undefined,
    })),
    ...(recentExp || []).filter(Boolean).map(e => ({
      id: e.id, amount: conv(e.amount, e.currency), currency: baseCurrency,
      date: e.date, type: 'expense' as const,
      category: e.category ?? undefined,
      description: e.description ?? undefined,
      notes: e.notes ?? undefined,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  return {
    isNewUser: profile ? !profile.preferred_currency : true,
    summary: {
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      currency: baseCurrency,
      thisMonth: { 
        income: thisMonthIncomeAmt, 
        expense: thisMonthExpenseAmt, 
        growth: 0 // Placeholder
      },
      budget: { 
        enabled: !!profile?.budgeting_enabled, 
        totalBudgeted: 0, 
        totalSpent: thisMonthExpenseAmt, 
        totalRollover: 0, 
        freeToSpend: 0 
      }
    },
    dti: {
      ...dtiResult,
      ratio: Math.round(dtiResult.ratio),
      gross_income: monthlyIncome,
      total_debt: monthlyDebt,
      housing_debt: 0,
      front_end_ratio: 0,
      currency: baseCurrency,
      recommendation: strategy.getRationale(dtiResult),
      breakdown: { income_sources: incomes.length, active_loans: activeLoans.length }
    },
    marketTrends: [], 
    recentTransactions,
    trend: [],
    categoryBreakdown: [],
    budgetRecommendation: budgetRec,
    subscriptions: [],
    goals: (goals || []).filter(Boolean).map(g => ({
      id: g.id,
      name: g.name,
      progress: g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
      target: g.target_amount,
      current: g.current_amount,
      type: g.type,
      deadline: g.deadline
    })),
    profile: {
      full_name: profile?.full_name || null,
      email: profile?.email || '',
      preferred_currency: baseCurrency,
      budgeting_enabled: !!profile?.budgeting_enabled,
      global_rollover_enabled: !!profile?.rollover_start_month,
      rollover_start_month: profile?.rollover_start_month || null
    }
  }
}

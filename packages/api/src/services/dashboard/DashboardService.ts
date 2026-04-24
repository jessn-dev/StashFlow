import { SupabaseClient } from '@supabase/supabase-js'
import { 
  Database, 
  getRegionalStrategy, 
  calculateDTIRatio, 
  generateSmartBudget,
  DashboardPayload,
  Transaction,
  convertToBase,
  RateMap
} from '@stashflow/core'

/**
 * DashboardService: Lean orchestrator for dashboard data.
 * Consumes modular packages for logic.
 */
export class DashboardService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getPayload(): Promise<DashboardPayload> {
    const now = new Date()
    const ymStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const currentPeriod = ymStr(now)
    const sixMonthsAgoStart = `${ymStr(new Date(now.getFullYear(), now.getMonth() - 5, 1))}-01`

    // 1. Concurrent fetching with individual resilience (Partial Success Model)
    const [
      profileRes,
      incomesRes,
      loansRes,
      expensesRes,
      ratesRes,
      trendsRes,
      goalsRes,
      metaRes,
      recentIncRes,
      recentExpRes
    ] = await Promise.all([
      this.supabase.from('profiles').select('*').single(),
      this.supabase.from('incomes').select('*'),
      this.supabase.from('loans').select('*').eq('status', 'active'),
      this.supabase.from('expenses').select('*').gte('date', sixMonthsAgoStart),
      this.supabase.from('exchange_rates').select('*'),
      this.supabase.from('market_trends').select('*').order('period', { ascending: false }),
      this.supabase.from('goals').select('*'),
      this.supabase.from('category_metadata').select('*'),
      this.supabase.from('incomes').select('*').order('date', { ascending: false }).limit(10),
      this.supabase.from('expenses').select('*').order('date', { ascending: false }).limit(10)
    ])

    const profile = profileRes.data
    const incomes = incomesRes.data || []
    const loans = loansRes.data || []
    const expenses = expensesRes.data || []
    const rates = ratesRes.data || []
    const trends = trendsRes.data || []
    const goals = goalsRes.data || []
    const categoryMeta = metaRes.data || []
    const recentInc = recentIncRes.data || []
    const recentExp = recentExpRes.data || []

    const baseCurrency = profile?.preferred_currency || 'USD'
    const rateMap: RateMap = {}
    if (Array.isArray(rates)) {
      rates.filter(Boolean).forEach(r => { rateMap[`${r.base}_${r.target}`] = Number(r.rate) })
    }

    // 2. Delegate logic to hardened core aggregation
    const { aggregateDashboardData } = await import('@stashflow/core')
    return aggregateDashboardData({
      profile,
      incomes,
      expenses,
      loans,
      payments: [], // TODO: fetch payments if needed for liabilities
      rates,
      trends,
      goals,
      categoryMeta,
      recentInc,
      recentExp
    })
  }
}

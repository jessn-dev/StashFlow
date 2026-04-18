import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Get User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error(`Unauthorized: ${userError?.message || 'No user'}`)

    // 2. Fetch all required data in parallel
    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const currentPeriod = now.toISOString().slice(0, 7) // YYYY-MM

    const results = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('id', user.id).single(),
      supabaseClient.from('incomes').select('*').eq('user_id', user.id),
      supabaseClient.from('expenses').select('*').eq('user_id', user.id),
      supabaseClient.from('loans').select('*').eq('user_id', user.id),
      supabaseClient.from('loan_payments').select('*').eq('user_id', user.id),
      supabaseClient.from('exchange_rates').select('*'),
      supabaseClient.from('budget_periods').select('*').eq('user_id', user.id).eq('period', currentPeriod),
      supabaseClient.from('goals').select('*').eq('user_id', user.id)
    ])

    // Check for query errors
    const errors = results.filter(r => r.error).map(r => r.error?.message)
    if (errors.length > 0) {
      throw new Error(`Database queries failed: ${errors.join(', ')}`)
    }

    const profile = results[0].data
    const incomes = results[1].data
    const expenses = results[2].data
    const loans = results[3].data
    const payments = results[4].data
    const rates = results[5].data
    const budgetPeriods = results[6].data
    const goals = results[7].data

    const baseCurrency = profile?.preferred_currency || 'USD'

    // 3. Currency Conversion Helper
    const convertToBase = (amount: any, fromCurrency: string): number => {
      const val = Number(amount) || 0
      if (fromCurrency === baseCurrency) return val
      
      const rateEntry = rates?.find((r: any) => r.base === baseCurrency && r.target === fromCurrency)
      if (rateEntry) return val / Number(rateEntry.rate)
      
      const inverseRateEntry = rates?.find((r: any) => r.base === fromCurrency && r.target === baseCurrency)
      if (inverseRateEntry) return val * Number(inverseRateEntry.rate)

      if (baseCurrency !== 'USD' && fromCurrency !== 'USD') {
        const toUsd = rates?.find((r: any) => r.base === 'USD' && r.target === fromCurrency)
        const fromUsd = rates?.find((r: any) => r.base === 'USD' && r.target === baseCurrency)
        if (toUsd && fromUsd) {
          return (val / Number(toUsd.rate)) * Number(fromUsd.rate)
        }
      }
      return val
    }

    // 4. Aggregate Monthly Income (with Regional Haircuts)
    let grossMonthlyIncome = 0
    incomes?.forEach((inc: any) => {
      let amount = convertToBase(inc.amount, inc.currency)
      
      // SGD Haircut: Variable income (commissions/bonuses/verifiable rental) 
      // are haircut by 30% per MAS TDSR rules.
      // We assume non-salary sources or 'one-time' might be variable.
      if (baseCurrency === 'SGD' && (inc.source.toLowerCase().includes('commission') || inc.source.toLowerCase().includes('bonus'))) {
        amount *= 0.7
      }

      if (inc.frequency === 'monthly') grossMonthlyIncome += amount
      else if (inc.frequency === 'weekly') grossMonthlyIncome += amount * (52 / 12)
    })

    // 5. Aggregate Monthly Debt (Regional Logic)
    let totalMonthlyDebt = 0
    let housingOnlyDebt = 0
    
    // Add active loan installments
    loans?.filter((l: any) => l.status === 'active').forEach((loan: any) => {
      const amt = convertToBase(loan.installment_amount, loan.currency)
      totalMonthlyDebt += amt
      // Note: In a real app, we'd check if loan.type === 'mortgage'
      if (loan.name.toLowerCase().includes('mortgage') || loan.name.toLowerCase().includes('home')) {
        housingOnlyDebt += amt
      }
    })

    // Add recurring housing (Standard for Back-end DTI)
    expenses?.filter((e: any) => e.is_recurring && e.category === 'housing').forEach((exp: any) => {
      const amt = convertToBase(exp.amount, exp.currency)
      totalMonthlyDebt += amt
      housingOnlyDebt += amt
    })

    // 6. Calculate DTI with Regional Thresholds
    let dtiRatio = 0
    let dtiStatus = 'low'
    let dtiColor = '#1A7A7A'
    let recommendation = ""
    
    // Default thresholds (USA/International standard)
    let healthyLimit = 36
    let maxLimit = 43

    if (baseCurrency === 'PHP') {
      healthyLimit = 30
      maxLimit = 40
    } else if (baseCurrency === 'SGD') {
      healthyLimit = 45
      maxLimit = 55 // MAS TDSR Cap
    } else if (baseCurrency === 'JPY') {
      healthyLimit = 30
      maxLimit = 45
    }

    if (grossMonthlyIncome > 0) {
      dtiRatio = (totalMonthlyDebt / grossMonthlyIncome) * 100
      
      if (dtiRatio <= healthyLimit) {
        dtiStatus = 'low'; dtiColor = '#1A7A7A'
        recommendation = `Your DTI is healthy for ${baseCurrency} standards (under ${healthyLimit}%).`
      } else if (dtiRatio <= maxLimit) {
        dtiStatus = 'medium'; dtiColor = '#EAB308'
        recommendation = `You are in the caution zone for ${baseCurrency}. Lenders prefer under ${healthyLimit}%.`
      } else {
        dtiStatus = 'high'; dtiColor = '#D4522A'
        recommendation = `High Risk: Your DTI exceeds the ${baseCurrency} recommended limit of ${maxLimit}%.`
      }
    } else if (totalMonthlyDebt > 0) {
      dtiRatio = 100; dtiStatus = 'high'; dtiColor = '#D4522A'
      recommendation = "No income recorded against your debt."
    }

    // Add specific regional context to recommendations
    if (baseCurrency === 'USD') {
      const frontEnd = (housingOnlyDebt / (grossMonthlyIncome || 1)) * 100
      if (frontEnd > 28) {
        recommendation += " Your housing-to-income ratio (Front-end) exceeds the 28% rule."
      }
    } else if (baseCurrency === 'JPY') {
      recommendation += " Note: Japanese banks may use a 3-4% screening rate for stress tests."
    }

    // 7. Month-over-Month Summary
    const thisMonthIncomes = incomes?.filter((i: any) => i.date >= firstDayThisMonth).reduce((s: number, i: any) => s + convertToBase(i.amount, i.currency), 0) || 0
    const thisMonthExpenses = expenses?.filter((e: any) => e.date >= firstDayThisMonth).reduce((s: number, e: any) => s + convertToBase(e.amount, e.currency), 0) || 0
    
    const lastMonthIncomes = incomes?.filter((i: any) => i.date >= firstDayLastMonth && i.date < firstDayThisMonth).reduce((s: number, i: any) => s + convertToBase(i.amount, i.currency), 0) || 0
    const lastMonthExpenses = expenses?.filter((e: any) => e.date >= firstDayLastMonth && e.date < firstDayThisMonth).reduce((s: number, e: any) => s + convertToBase(e.amount, e.currency), 0) || 0

    // 8. 6-Month Cash Flow Trend
    const trend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d.toISOString()
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
      
      const monthInc = incomes?.filter((inc: any) => inc.date >= start && inc.date < end).reduce((s: number, inc: any) => s + convertToBase(inc.amount, inc.currency), 0) || 0
      const monthExp = expenses?.filter((exp: any) => exp.date >= start && exp.date < end).reduce((s: number, exp: any) => s + convertToBase(exp.amount, exp.currency), 0) || 0
      
      trend.push({
        month: d.toLocaleString('default', { month: 'short' }),
        income: Number(monthInc.toFixed(2)),
        expense: Number(monthExp.toFixed(2))
      })
    }

    // 9. Summary (Net Worth, Assets, Remaining Liabilities)
    const totalAssets = (incomes ?? []).reduce((sum: number, inc: any) => sum + convertToBase(inc.amount, inc.currency), 0)
    
    let totalLiabilities = 0
    loans?.forEach((loan: any) => {
      const loanPayments = (payments ?? []).filter((p: any) => p.loan_id === loan.id)
      const pendingCount = loanPayments.filter((p: any) => p.status === 'pending' || p.status === 'overdue').length
      totalLiabilities += convertToBase(Number(loan.installment_amount) * pendingCount, loan.currency)
    })
    const netWorth = totalAssets - totalLiabilities

    // 10. Spending Category Breakdown (Current Month)
    const catMap: Record<string, number> = {}
    expenses?.filter((e: any) => e.date >= firstDayThisMonth).forEach((e: any) => {
      const amt = convertToBase(e.amount, e.currency)
      catMap[e.category] = (catMap[e.category] || 0) + amt
    })
    const categoryBreakdown = Object.entries(catMap).map(([category, amount]) => ({ 
      category, 
      amount: Number(amount.toFixed(2)) 
    })).sort((a, b) => b.amount - a.amount)

    // 11. Budgeting Data (Current Month)
    const budgetSummary = {
      enabled: profile?.budgeting_enabled || false,
      totalBudgeted: budgetPeriods?.reduce((s: number, p: any) => s + Number(p.budgeted), 0) || 0,
      totalSpent: budgetPeriods?.reduce((s: number, p: any) => s + Number(p.spent), 0) || 0,
      totalRollover: budgetPeriods?.reduce((s: number, p: any) => s + Number(p.rolled_over_amount), 0) || 0,
    }
    const freeToSpend = (budgetSummary.totalBudgeted + budgetSummary.totalRollover) - budgetSummary.totalSpent

    // 12. Goals Summary
    const goalSummary = goals?.map((g: any) => ({
      id: g.id,
      name: g.name,
      progress: g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
      target: g.target_amount,
      current: g.current_amount,
      type: g.type,
      deadline: g.deadline
    })) || []

    // 13. Final Payload
    return new Response(
      JSON.stringify({
        summary: {
          netWorth: Number(netWorth.toFixed(2)),
          totalAssets: Number(totalAssets.toFixed(2)),
          totalLiabilities: Number(totalLiabilities.toFixed(2)),
          currency: baseCurrency,
          thisMonth: {
            income: Number(thisMonthIncomes.toFixed(2)),
            expense: Number(thisMonthExpenses.toFixed(2)),
            growth: lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0
          },
          budget: {
            ...budgetSummary,
            freeToSpend: Number(freeToSpend.toFixed(2))
          }
        },
        dti: {
          ratio: Number(dtiRatio.toFixed(2)),
          status: dtiStatus,
          color: dtiColor,
          gross_income: Number(grossMonthlyIncome.toFixed(2)),
          total_debt: Number(totalMonthlyDebt.toFixed(2)),
          housing_debt: Number(housingOnlyDebt.toFixed(2)),
          front_end_ratio: Number(((housingOnlyDebt / (grossMonthlyIncome || 1)) * 100).toFixed(2)),
          currency: baseCurrency,
          recommendation,
          breakdown: {
            income_sources: incomes?.filter((i: any) => i.frequency !== 'one-time').length || 0,
            active_loans: loans?.filter((l: any) => l.status === 'active').length || 0
          }
        },
        recentTransactions: [
          ...(incomes ?? []).map((i: any) => ({ id: i.id, amount: i.amount, currency: i.currency, date: i.date, type: 'income' as const, source: i.source })),
          ...(expenses ?? []).map((e: any) => ({ id: e.id, amount: e.amount, currency: e.currency, date: e.date, type: 'expense' as const, category: e.category, description: e.description }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
        trend,
        categoryBreakdown,
        goals: goalSummary,
        profile: {
          full_name: profile?.full_name,
          email: profile?.email,
          preferred_currency: baseCurrency,
          budgeting_enabled: profile?.budgeting_enabled,
          global_rollover_enabled: profile?.global_rollover_enabled,
          rollover_start_month: profile?.rollover_start_month
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

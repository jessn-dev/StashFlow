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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const [
      { data: profile },
      { data: incomes },
      { data: expenses },
      { data: loans },
      { data: rates }
    ] = await Promise.all([
      supabaseClient.from('profiles').select('preferred_currency').eq('id', user.id).single(),
      supabaseClient.from('incomes').select('*').eq('user_id', user.id),
      supabaseClient.from('expenses').select('*').eq('user_id', user.id).eq('is_recurring', true),
      supabaseClient.from('loans').select('*, loan_payments(*)').eq('user_id', user.id).eq('status', 'active'),
      supabaseClient.from('exchange_rates').select('*')
    ])

    const baseCurrency = profile?.preferred_currency || 'USD'

    const convertToBase = (amount: any, fromCurrency: string): number => {
      const val = Number(amount) || 0
      if (fromCurrency === baseCurrency) return val
      const rateEntry = rates?.find((r: any) => r.base === baseCurrency && r.target === fromCurrency)
      if (rateEntry) return val / Number(rateEntry.rate)
      const inverse = rates?.find((r: any) => r.base === fromCurrency && r.target === baseCurrency)
      if (inverse) return val * Number(inverse.rate)
      return val
    }

    const projections = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
      const period = d.toISOString().slice(0, 7)
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit', timeZone: 'UTC' })

      let monthlyIncome = 0
      incomes?.forEach((inc: any) => {
        const amt = convertToBase(inc.amount, inc.currency)
        if (inc.frequency === 'monthly') monthlyIncome += amt
        else if (inc.frequency === 'weekly') monthlyIncome += amt * (52 / 12)
      })

      const categories: Record<string, number> = {}
      let monthlyExpenses = 0
      expenses?.forEach((exp: any) => {
        const amt = convertToBase(exp.amount, exp.currency)
        monthlyExpenses += amt
        categories[exp.category] = (categories[exp.category] || 0) + amt
      })

      let monthlyDebt = 0
      loans?.forEach((loan: any) => {
        const dueThisMonth = loan.loan_payments?.filter((p: any) => p.due_date.startsWith(period))
        if (dueThisMonth && dueThisMonth.length > 0) {
          const amt = convertToBase(loan.installment_amount, loan.currency)
          monthlyDebt += amt
          categories['debt'] = (categories['debt'] || 0) + amt
        }
      })

      projections.push({
        period,
        month: monthName,
        income: Number(monthlyIncome.toFixed(2)),
        expense: Number((monthlyExpenses + monthlyDebt).toFixed(2)),
        net: Number((monthlyIncome - monthlyExpenses - monthlyDebt).toFixed(2)),
        categories: Object.entries(categories).map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) })).sort((a,b) => b.amount - a.amount).slice(0, 3)
      })
    }

    return new Response(
      JSON.stringify({
        currency: baseCurrency,
        projections
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

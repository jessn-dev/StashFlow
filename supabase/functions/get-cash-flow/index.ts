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
    if (userError || !user) throw new Error('Unauthorized')

    // 2. Fetch required data
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

    // 3. Projections for 12 months
    const projections = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const period = d.toISOString().slice(0, 7)
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' })

      // Recurring Income
      let monthlyIncome = 0
      incomes?.forEach((inc: any) => {
        const amt = convertToBase(inc.amount, inc.currency)
        if (inc.frequency === 'monthly') monthlyIncome += amt
        else if (inc.frequency === 'weekly') monthlyIncome += amt * (52 / 12)
      })

      // Recurring Expenses
      let monthlyExpenses = 0
      expenses?.forEach((exp: any) => {
        monthlyExpenses += convertToBase(exp.amount, exp.currency)
      })

      // Loan Installments due in this month
      let monthlyDebt = 0
      loans?.forEach((loan: any) => {
        const dueThisMonth = loan.loan_payments?.filter((p: any) => p.due_date.startsWith(period))
        if (dueThisMonth && dueThisMonth.length > 0) {
          monthlyDebt += convertToBase(loan.installment_amount, loan.currency)
        }
      })

      projections.push({
        period,
        month: monthName,
        income: Number(monthlyIncome.toFixed(2)),
        expenses: Number(monthlyExpenses.toFixed(2)),
        debt: Number(monthlyDebt.toFixed(2)),
        net: Number((monthlyIncome - monthlyExpenses - monthlyDebt).toFixed(2))
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

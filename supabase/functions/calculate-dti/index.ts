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

    // 2. Fetch all required data in parallel
    const [
      { data: profile },
      { data: incomes },
      { data: loans },
      { data: expenses },
      { data: rates }
    ] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('id', user.id).single(),
      supabaseClient.from('incomes').select('*').eq('user_id', user.id),
      supabaseClient.from('loans').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabaseClient.from('expenses').select('*').eq('user_id', user.id),
      supabaseClient.from('exchange_rates').select('*')
    ])

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

    // 4. Calculate Gross Monthly Income (with Haircuts)
    let monthlyIncome = 0
    incomes?.forEach((inc: any) => {
      let amount = convertToBase(inc.amount, inc.currency)
      
      // SGD Haircut: Variable income by 30%
      if (baseCurrency === 'SGD' && (inc.source.toLowerCase().includes('commission') || inc.source.toLowerCase().includes('bonus'))) {
        amount *= 0.7
      }

      if (inc.frequency === 'monthly') {
        monthlyIncome += amount
      } else if (inc.frequency === 'weekly') {
        monthlyIncome += amount * (52 / 12)
      }
    })

    // 5. Calculate Monthly Debt (Regional Logic)
    let monthlyDebt = 0
    let housingOnlyDebt = 0
    
    loans?.forEach((loan: any) => {
      const amt = convertToBase(loan.installment_amount, loan.currency)
      monthlyDebt += amt
      if (loan.name.toLowerCase().includes('mortgage') || loan.name.toLowerCase().includes('home')) {
        housingOnlyDebt += amt
      }
    })

    expenses?.filter((e: any) => e.is_recurring && e.category === 'housing').forEach((exp: any) => {
      const amt = convertToBase(exp.amount, exp.currency)
      monthlyDebt += amt
      housingOnlyDebt += amt
    })

    // 6. DTI Result & Risk Assessment (Regional Thresholds)
    let ratio = 0
    let status = 'low'
    let color = '#1A7A7A'
    let recommendation = ""

    let healthyLimit = 36
    let maxLimit = 43

    if (baseCurrency === 'PHP') { healthyLimit = 30; maxLimit = 40 }
    else if (baseCurrency === 'SGD') { healthyLimit = 45; maxLimit = 55 }
    else if (baseCurrency === 'JPY') { healthyLimit = 30; maxLimit = 45 }

    if (monthlyIncome > 0) {
      ratio = (monthlyDebt / monthlyIncome) * 100
      if (ratio <= healthyLimit) {
        status = 'low'; color = '#1A7A7A'
        recommendation = `Your DTI is healthy for ${baseCurrency} standards.`
      } else if (ratio <= maxLimit) {
        status = 'medium'; color = '#EAB308'
        recommendation = `You are in the caution zone for ${baseCurrency}.`
      } else {
        status = 'high'; color = '#D4522A'
        recommendation = `High Risk: Your DTI exceeds ${baseCurrency} recommended limits.`
      }
    } else if (monthlyDebt > 0) {
      ratio = 100; status = 'high'; color = '#D4522A'
      recommendation = "No income recorded against your debt."
    }

    if (baseCurrency === 'USD') {
      const frontEnd = (housingOnlyDebt / (monthlyIncome || 1)) * 100
      if (frontEnd > 28) recommendation += " Your housing-to-income ratio exceeds 28%."
    }

    return new Response(
      JSON.stringify({
        ratio: Number(ratio.toFixed(2)),
        status,
        color,
        gross_income: Number(monthlyIncome.toFixed(2)),
        total_debt: Number(monthlyDebt.toFixed(2)),
        housing_debt: Number(housingOnlyDebt.toFixed(2)),
        front_end_ratio: Number(((housingOnlyDebt / (monthlyIncome || 1)) * 100).toFixed(2)),
        currency: baseCurrency,
        recommendation,
        breakdown: {
          income_sources: incomes?.filter((i: any) => i.frequency !== 'one-time').length || 0,
          active_loans: loans?.length || 0
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

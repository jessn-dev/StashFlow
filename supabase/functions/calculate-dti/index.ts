import { createClient } from "@supabase/supabase-js"
import { convertToBase, calculateDTIRatio, getRegionByCurrency, type MathExchangeRate } from "@stashflow/core"

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
    const region = getRegionByCurrency(baseCurrency)
    const ratesList = (rates || []) as unknown as MathExchangeRate[]

    // 3. Calculate Gross Monthly Income (with Haircuts)
    let monthlyIncome = 0
    incomes?.forEach((inc: any) => {
      let amount = convertToBase(inc.amount, inc.currency, baseCurrency, ratesList)
      
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

    // 5. Calculate Monthly Debt
    let monthlyDebt = 0
    let housingOnlyDebt = 0
    
    loans?.forEach((loan: any) => {
      const amt = convertToBase(loan.installment_amount, loan.currency, baseCurrency, ratesList)
      monthlyDebt += amt
      if (loan.name.toLowerCase().includes('mortgage') || loan.name.toLowerCase().includes('home')) {
        housingOnlyDebt += amt
      }
    })

    expenses?.filter((e: any) => e.is_recurring && e.category === 'housing').forEach((exp: any) => {
      const amt = convertToBase(exp.amount, exp.currency, baseCurrency, ratesList)
      monthlyDebt += amt
      housingOnlyDebt += amt
    })

    // 4. Use Canonical DTI Calculation
    const dtiResult = calculateDTIRatio(monthlyDebt, monthlyIncome, region)
    
    // Status and Recommendation overrides for complex cases
    let { status, color, label: recommendation } = dtiResult as any
    if (status === 'low') color = '#1A7A7A'
    else if (status === 'medium') color = '#EAB308'
    else { color = '#D4522A' }

    if (baseCurrency === 'USD') {
      const frontEnd = (housingOnlyDebt / (monthlyIncome || 1)) * 100
      if (frontEnd > 28) recommendation += " Your housing-to-income ratio exceeds 28%."
    }

    return new Response(
      JSON.stringify({
        ratio: Number(dtiResult.ratio * 100).toFixed(2),
        status: dtiResult.isHealthy ? 'low' : 'high', // Simplified mapping for UI compatibility
        color,
        gross_income: Number(monthlyIncome.toFixed(2)),
        total_debt: Number(monthlyDebt.toFixed(2)),
        housing_debt: Number(housingOnlyDebt.toFixed(2)),
        front_end_ratio: Number(((housingOnlyDebt / (monthlyIncome || 1)) * 100).toFixed(2)),
        currency: baseCurrency,
        recommendation: dtiResult.label + " — " + recommendation,
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

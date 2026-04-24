import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { aggregateDashboardData } from "@stashflow/core"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

    // 1. Resilient Concurrent Fetching
    const [
      profileRes,
      incomesRes,
      expensesRes,
      loansRes,
      paymentsRes,
      ratesRes,
      trendsRes,
      goalsRes,
      metaRes
    ] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('id', user.id).single(),
      supabaseClient.from('incomes').select('*').eq('user_id', user.id),
      supabaseClient.from('expenses').select('*').eq('user_id', user.id),
      supabaseClient.from('loans').select('*').eq('user_id', user.id),
      supabaseClient.from('loan_payments').select('*').eq('user_id', user.id),
      supabaseClient.from('exchange_rates').select('*'),
      supabaseClient.from('market_trends').select('*').order('period', { ascending: false }),
      supabaseClient.from('goals').select('*').eq('user_id', user.id),
      supabaseClient.from('category_metadata').select('*')
    ])

    // 2. Pure Orchestration: Delegate logic to @stashflow/core
    const payload = aggregateDashboardData({
      profile: profileRes.data,
      incomes: incomesRes.data || [],
      expenses: expensesRes.data || [],
      loans: loansRes.data || [],
      payments: paymentsRes.data || [],
      rates: ratesRes.data || [],
      trends: trendsRes.data || [],
      goals: goalsRes.data || [],
      categoryMeta: metaRes.data || []
    })

    return new Response(
      JSON.stringify(payload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

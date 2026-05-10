import { createClient } from "@supabase/supabase-js"
import {
  aggregateDashboardData,
  getRegionByCurrency
} from "@stashflow/core"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const [incomes, expenses, loans, assets, goals, rates, profile] = await Promise.all([
      supabase.from('incomes').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id),
      supabase.from('loans').select('*').eq('user_id', user.id),
      supabase.from('assets').select('*').eq('user_id', user.id),
      supabase.from('goals').select('*').eq('user_id', user.id),
      supabase.from('exchange_rates').select('target, rate'),
      supabase.from('profiles').select('*').eq('id', user.id).single()
    ])

    const ratesMap = (rates.data || []).reduce((acc: Record<string, number>, curr: { target: string; rate: number }) => {
      acc[curr.target] = curr.rate
      return acc
    }, { USD: 1 })

    const payload = aggregateDashboardData({
      incomes: incomes.data || [],
      expenses: expenses.data || [],
      loans: loans.data || [],
      assets: assets.data || [],
      goals: goals.data || [],
      rates: ratesMap,
      region: getRegionByCurrency(profile.data?.preferred_currency || 'USD'),
      currency: profile.data?.preferred_currency || 'USD'
    })

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

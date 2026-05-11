import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PYTHON_BACKEND_URL = Deno.env.get('PYTHON_BACKEND_URL') || 'http://host.docker.internal:8008'

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

    // 1. Get User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // 2. Fetch last 6 months of expenses
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const { data: expenses, error: fetchError } = await supabaseClient
      .from('expenses')
      .select('date, amount, category, description')
      .eq('user_id', user.id)
      .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (fetchError) throw fetchError

    if (!expenses || expenses.length < 5) {
      return new Response(
        JSON.stringify({ anomalies: [], message: "Not enough data for analysis. Keep tracking for a few more weeks!" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 3. Map to Python Schema
    const transactions = expenses.map(e => ({
      date: e.date,
      amount: Number(e.amount),
      category: e.category,
      description: e.description || "No description"
    }))

    // 4. Call Python Backend
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/v1/analysis/anomalies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Python backend error ${res.status}: ${errorText}`)
    }

    const report = await res.json()

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    console.error('[detect-anomalies] error', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

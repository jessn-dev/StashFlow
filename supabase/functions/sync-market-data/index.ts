import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * sync-market-data
 * -------------------
 * Fetches latest macroeconomic data from FRED API.
 */

const SERIES_TO_TRACK = [
  // US & Global General
  { id: 'CPIAUCSL', name: 'US Inflation', cat: null, currency: 'USD' },
  { id: 'CUSR0000SAF11', name: 'US Groceries', cat: 'food', currency: 'USD' },
  { id: 'CUSR0000SAH1', name: 'US Housing', cat: 'housing', currency: 'USD' },
  
  // International CPIs (from FRED)
  { id: 'CP0000EZ19M086NEST', name: 'Eurozone Inflation', cat: null, currency: 'EUR' },
  { id: 'GBRCPIALLMINMEI', name: 'UK Inflation', cat: null, currency: 'GBP' },
  { id: 'JPNCPIALLMINMEI', name: 'Japan Inflation', cat: null, currency: 'JPY' },
  { id: 'SGPCPIALLMINMEI', name: 'Singapore Inflation', cat: null, currency: 'SGD' },
  
  // Sector specific (US only due to FRED granularity)
  { id: 'CUSR0000SAT', name: 'US Transport', cat: 'transport', currency: 'USD' },
  { id: 'CUSR0000SEHF01', name: 'US Electricity', cat: 'utilities', currency: 'USD' },
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("Sync Market Data triggered")
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const fredApiKey = Deno.env.get('FRED_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  console.log("FRED_API_KEY present:", !!fredApiKey)
  console.log("SUPABASE_URL present:", !!supabaseUrl)
  console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!supabaseServiceKey)

  // Debug: Handle a direct ping to check variable presence
  const urlObj = new URL(req.url)
  if (urlObj.searchParams.has('health')) {
    return new Response(JSON.stringify({ 
      fred: !!fredApiKey && fredApiKey !== 'YOUR_FRED_API_KEY_HERE',
      url: !!supabaseUrl,
      key: !!supabaseServiceKey
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (!fredApiKey || fredApiKey === 'YOUR_FRED_API_KEY_HERE') {
    return new Response(JSON.stringify({ 
      error: 'FRED_API_KEY is missing or using placeholder.',
      hint: 'Ensure FRED_API_KEY is set in your Supabase secrets or local .env file.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ 
      error: 'Supabase internal configuration missing (URL or Service Key).',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const results: any[] = []

    for (const series of SERIES_TO_TRACK) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=2`
      
      try {
        const resp = await fetch(url)
        if (!resp.ok) continue

        const data = await resp.json()
        const observations = data.observations || []

        observations.forEach((obs: any) => {
          if (obs.value !== '.') { // FRED uses '.' for missing values
            results.push({
              series_id: series.id,
              series_name: series.name,
              category: series.cat,
              value: parseFloat(obs.value),
              period: obs.date,
            })
          }
        })
      } catch (e) {
        console.error(`Failed to fetch ${series.id}:`, e)
      }
    }

    if (results.length > 0) {
      const { error } = await supabase
        .from('market_trends')
        .upsert(results, { onConflict: 'series_id,period' })
      
      if (error) throw error
    }

    return new Response(JSON.stringify({ 
      success: true, 
      updated: results.length,
      note: results.length === 0 ? "No new data found. Check FRED_API_KEY." : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
  })

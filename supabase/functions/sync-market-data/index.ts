import { createClient } from "@supabase/supabase-js"

/**
 * sync-market-data
 * -------------------
 * Fetches latest macroeconomic data from FRED API.
 * Supports multiple regions based on selected currency.
 */

const SERIES_TO_TRACK = [
  // ── USD (United States) ───────────────────────────────────────────────────
  { id: 'CPIAUCSL',        name: 'US CPI (Inflation)',  cat: null,        currency: 'USD' },
  { id: 'FEDFUNDS',        name: 'Fed Funds Rate',      cat: null,        currency: 'USD' },
  { id: 'UNRATE',          name: 'US Unemployment',     cat: null,        currency: 'USD' },
  { id: 'CUSR0000SAF11',   name: 'US Groceries',        cat: 'food',      currency: 'USD' },
  { id: 'CPIHOSSL',        name: 'US Housing CPI',      cat: 'housing',   currency: 'USD' },
  { id: 'CUSR0000SET',     name: 'US Transport CPI',    cat: 'transport', currency: 'USD' },
  { id: 'CUSR0000SEHF01',  name: 'US Electricity CPI', cat: 'utilities', currency: 'USD' },

  // ── EUR (Eurozone) ────────────────────────────────────────────────────────
  { id: 'CP0000EZ19M086NEST', name: 'Eurozone CPI',        cat: null,        currency: 'EUR' },
  { id: 'IRLTLT01EZM156N',    name: 'EU 10yr Bond Yield',    cat: null, currency: 'EUR' },
  { id: 'LMUNRRTTEZM156S',    name: 'Eurozone Unemployment', cat: null, currency: 'EUR' },

  // ── GBP (United Kingdom) ──────────────────────────────────────────────────
  { id: 'GBRCPIALLMINMEI',  name: 'UK CPI (Inflation)',   cat: null, currency: 'GBP' },
  { id: 'IRLTLT01GBM156N',  name: 'UK 10yr Gilt Yield',  cat: null, currency: 'GBP' },
  { id: 'LMUNRRTTGBM156S',  name: 'UK Unemployment',     cat: null, currency: 'GBP' },

  // ── JPY (Japan) ───────────────────────────────────────────────────────────
  { id: 'CPALTT01JPM657N',  name: 'Japan CPI',           cat: null, currency: 'JPY' },
  { id: 'IRLTLT01JPM156N',  name: 'Japan 10yr Bond',     cat: null, currency: 'JPY' },
  { id: 'LMUNRRTTJPM156S',  name: 'Japan Unemployment',  cat: null, currency: 'JPY' },

  // ── SGD (Singapore) ───────────────────────────────────────────────────────
  { id: 'SGPPCPIPCPPPT',    name: 'Singapore CPI',       cat: null, currency: 'SGD' },
  { id: 'INTDSRSGM193N',    name: 'MAS Discount Rate',   cat: null, currency: 'SGD' },

  // ── PHP (Philippines) ─────────────────────────────────────────────────────
  { id: 'PHLPCPIPCPPPT',    name: 'PH CPI (Inflation)',  cat: null, currency: 'PHP' },
  { id: 'INTDSRPHM193N',    name: 'BSP Discount Rate',   cat: null, currency: 'PHP' },
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Forbidden', { status: 403 })
  }

  console.log('[sync-market-data] triggered')

  const fredApiKey = Deno.env.get('FRED_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!fredApiKey || fredApiKey === 'YOUR_FRED_API_KEY_HERE') {
    return new Response(JSON.stringify({ 
      error: 'FRED_API_KEY is missing.',
      hint: 'Ensure FRED_API_KEY is set in supabase/functions/.env'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
    const results: any[] = []

    for (const series of SERIES_TO_TRACK) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=10`
      
      try {
        const resp = await fetch(url)
        if (!resp.ok) {
          console.error(`FRED API error for ${series.id}: ${resp.status}`)
          continue
        }

        const data = await resp.json()
        const observations = data.observations || []
        
        console.log(`Received ${observations.length} observations for ${series.id}`)
        
        let captured = 0
        observations.forEach((obs: any) => {
          if (obs.value !== '.' && captured < 2) { 
            results.push({
              series_id: series.id,
              series_name: series.name,
              category: series.cat,
              currency: series.currency,
              value: Number.parseFloat(obs.value),
              period: obs.date,
            })
            captured++
          }
        })
        console.log(`Captured ${captured} points for ${series.id} (${series.currency})`)
      } catch (e) {
        console.error(`Failed to fetch ${series.id}:`, e)
      }
    }

    if (results.length > 0) {
      console.log(`Upserting ${results.length} rows to market_trends...`)
      const { error } = await supabase
        .from('market_trends')
        .upsert(results, { onConflict: 'series_id,period' })
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true, updated: results.length }), {
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

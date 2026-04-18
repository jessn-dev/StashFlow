import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * sync-exchange-rates
 * -------------------
 * Fetches latest rates from Frankfurter API and updates the public.exchange_rates table.
 * Supported: USD, EUR, GBP, PHP, SGD, JPY
 * 
 * Now stores BOTH forward (USD -> PHP) and reciprocal (PHP -> USD) rates for performance.
 */

const SUPPORTED_CURRENCIES = ['EUR', 'GBP', 'PHP', 'SGD', 'JPY']
const BASE_CURRENCY = 'USD'

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')

  // 1. Security Check (Required if triggered via external cron)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch from Frankfurter
    const symbols = SUPPORTED_CURRENCIES.join(',')
    const url = `https://api.frankfurter.app/latest?from=${BASE_CURRENCY}&to=${symbols}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Frankfurter API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const rates = data.rates
    const fetchedAt = new Date().toISOString()

    // 3. Prepare Bulk Upsert Data (Forward and Reverse)
    const upsertData: any[] = []

    Object.entries(rates).forEach(([target, rate]) => {
      const numRate = Number(rate)
      // Forward: USD -> TARGET
      upsertData.push({
        base: BASE_CURRENCY,
        target: target,
        rate: numRate,
        fetched_at: fetchedAt
      })
      // Reverse: TARGET -> USD
      upsertData.push({
        base: target,
        target: BASE_CURRENCY,
        rate: 1 / numRate,
        fetched_at: fetchedAt
      })
    })

    // 4. Update Database
    const { error } = await supabaseClient
      .from('exchange_rates')
      .upsert(upsertData, { onConflict: 'base,target' })

    if (error) throw error

    return new Response(JSON.stringify({ 
      success: true, 
      pairs_updated: upsertData.length,
      timestamp: fetchedAt 
    }), { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

import { createClient } from "@supabase/supabase-js"
import * as Sentry from "npm:@sentry/deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENTRY_DSN = Deno.env.get('SENTRY_DSN')

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')

    // 1. Fetch recent transactions for the user
    const [incomes, expenses] = await Promise.all([
      supabase.from('incomes').select('amount, currency').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('expenses').select('amount, currency').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
    ])

    const allTx = [
      ...(incomes.data || []).map(i => ({ amount: Number(i.amount), currency: i.currency, type: 'income' })),
      ...(expenses.data || []).map(e => ({ amount: Number(e.amount), currency: e.currency, type: 'expense' }))
    ]

    if (allTx.length === 0) {
      return new Response(JSON.stringify({ status: 'no_data' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Check for anomalous balance shifts (very large transactions compared to user average)
    const amounts = allTx.map(t => t.amount)
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const stdDev = Math.sqrt(amounts.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / amounts.length)

    const anomalies = allTx.filter(t => t.amount > avg + (stdDev * 5) && t.amount > 10000) // 5 std dev and > 10k units

    for (const anomaly of anomalies) {
      await supabase.from('system_audit_logs').insert({
        user_id: userId,
        event_type: 'financial.integrity.anomaly',
        action: 'detected_outlier',
        severity: 'medium',
        metadata: {
          type: anomaly.type,
          amount: anomaly.amount,
          currency: anomaly.currency,
          reason: 'Outlier amount detected (5+ std dev from average)'
        }
      })
    }

    // 3. Check for currency anomalies (transactions in currencies with no exchange rate)
    const { data: rates } = await supabase.from('exchange_rates').select('target')
    const knownCurrencies = new Set(['USD', ...(rates?.map(r => r.target) || [])])

    const unknownCurrencies = allTx.filter(t => !knownCurrencies.has(t.currency))
    for (const unknown of unknownCurrencies) {
      await supabase.from('system_audit_logs').insert({
        user_id: userId,
        event_type: 'financial.integrity.currency_mismatch',
        action: 'detected_unsupported_currency',
        severity: 'high',
        metadata: {
          currency: unknown.currency,
          amount: unknown.amount,
          reason: 'Transaction detected in currency with no cached exchange rate'
        }
      })
    }

    return new Response(JSON.stringify({ 
      status: 'success', 
      anomalies_found: anomalies.length,
      currency_issues_found: unknownCurrencies.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    if (SENTRY_DSN) Sentry.captureException(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

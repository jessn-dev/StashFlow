import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1"

Deno.serve(async (req) => {
  // 1. Security: Validate CRON_SECRET
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role OK for cron system tasks
    )

    // TODO: Fetch rates from external API (e.g., Frankfurter)
    // For now, mock a successful sync
    const mockRates = [
      { target: 'PHP', rate: 56.2 },
      { target: 'SGD', rate: 1.34 }
    ]

    for (const { target, rate } of mockRates) {
      await supabase
        .from('exchange_rates')
        .upsert({ base: 'USD', target, rate, fetched_at: new Date().toISOString() }, { onConflict: 'target' })
    }

    return new Response(JSON.stringify({ success: true, synced: mockRates.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

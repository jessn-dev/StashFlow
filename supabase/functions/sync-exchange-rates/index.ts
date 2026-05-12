import { createClient } from "@supabase/supabase-js"

Deno.serve(async (req) => {
  // 1. Security: Validate CRON_SECRET
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 2. Fetch latest rates from Frankfurter (USD base)
    // Supports PHP, SGD, EUR, GBP, JPY as targets
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=PHP,SGD,EUR,GBP,JPY')
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.statusText}`)
    }

    const data = await response.json()
    const rates = data.rates
    const fetched_at = new Date().toISOString()

    // 3. Prepare bidirectional pairs for upsert
    // We store USD -> Target and Target -> USD (inverse)
    // This allows dashboard to convert any currency to user's base via USD bridge if needed
    // or directly if base is USD/PHP/SGD.
    const upserts = []

    // Add USD -> USD (1:1)
    upserts.push({ base: 'USD', target: 'USD', rate: 1, fetched_at })

    for (const [target, rate] of Object.entries(rates)) {
      const numRate = Number(rate)
      // USD -> Target
      upserts.push({ base: 'USD', target, rate: numRate, fetched_at })
      // Target -> USD (inverse)
      upserts.push({ base: target, target: 'USD', rate: 1 / numRate, fetched_at })
    }

    // 4. Compute cross-rates (e.g., SGD -> PHP)
    // For every pair of non-USD currencies, compute the rate
    const targets = Object.keys(rates)
    for (const t1 of targets) {
      for (const t2 of targets) {
        if (t1 === t2) continue
        // rate(t1 -> t2) = rate(USD -> t2) / rate(USD -> t1)
        const crossRate = rates[t2] / rates[t1]
        upserts.push({ base: t1, target: t2, rate: crossRate, fetched_at })
      }
    }

    // 5. Upsert into database
    // UNIQUE(base, target) constraint handles conflicts
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(upserts, { onConflict: 'base,target' })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, count: upserts.length }), {
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

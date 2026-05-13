import { createClient } from "@supabase/supabase-js"

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Forbidden', { status: 403 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data, count } = await supabase
    .from('market_trends')
    .select('*', { count: 'exact' })
    .limit(5)

  return new Response(JSON.stringify({ count, sample: data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})

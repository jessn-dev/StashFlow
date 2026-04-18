import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, count } = await supabase
    .from('market_trends')
    .select('*', { count: 'exact' })
    .limit(5)

  return new Response(JSON.stringify({ count, sample: data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})

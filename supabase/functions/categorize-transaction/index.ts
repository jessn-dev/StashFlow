import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/validate.ts" // Need to check if corsHeaders is exported from validate.ts or just inline it

// Using the same headers pattern as other functions
const localCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PYTHON_BACKEND_URL = Deno.env.get('PYTHON_BACKEND_URL') || 'http://host.docker.internal:8008'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: localCorsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Get User to ensure authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return new Response('Unauthorized', { status: 401, headers: localCorsHeaders })

    // 2. Parse body
    const { description, amount } = await req.json()
    if (!description) throw new Error('Missing description')

    // 3. Call Python Backend
    const correlationId = crypto.randomUUID()
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/v1/transactions/categorize`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({ description, amount }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Python backend error ${res.status}: ${errorText}`)
    }

    const categorization = await res.json()

    return new Response(
      JSON.stringify(categorization),
      { headers: { ...localCorsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    console.error('[categorize-transaction] error', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...localCorsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

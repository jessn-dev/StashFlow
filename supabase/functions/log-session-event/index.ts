import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1"

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = await req.json()
    const { event, user } = payload

    // We only care about LOGIN events
    if (event !== 'LOGIN') {
      return new Response('Ignored', { status: 200 })
    }

    // Extract metadata from headers
    // Note: Headers might vary between local dev and production (Vercel/Supabase)
    const ip = req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') || 
               '127.0.0.1'
    
    // Country is often provided by cloudflare headers in production
    const country = req.headers.get('cf-ipcountry') || null

    const userAgent = req.headers.get('user-agent') || 'Unknown'

    // Insert session event
    const { error } = await supabase
      .from('session_events')
      .insert({
        user_id: user.id,
        session_id: payload.session_id || null, // Provided in some auth events
        ip,
        country,
        user_agent: userAgent
      })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
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

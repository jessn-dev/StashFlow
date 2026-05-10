import { createClient } from "@supabase/supabase-js"

// Pure logic inlined from @stashflow/core/security/sessionAnomaly
function calculateAnomalyScore(newEvent: any, history: any[]) {
  const reasons = [];
  let score = 0;

  if (history.length === 0) {
    return { score: 0, reasons: ['first_session'], highRisk: false };
  }

  const lastCountry = history[0].country;
  if (newEvent.country && lastCountry && newEvent.country !== lastCountry) {
    score += 0.7;
    reasons.push('geographic_shift');
  }

  const hour = new Date(newEvent.timestamp).getUTCHours();
  if (hour >= 23 || hour <= 4) {
    score += 0.3;
    reasons.push('unusual_hour');
  }

  const knownUAs = new Set(history.map((h) => h.userAgent));
  if (!knownUAs.has(newEvent.userAgent)) {
    score += 0.1;
    reasons.push('new_device');
  }

  score = Math.min(score, 1);
  return { score, reasons, highRisk: score >= 0.7 };
}

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    // 2. Fetch active sessions from auth schema
    // Note: We use rpc or direct query if possible. 
    // In many Supabase setups, service role can query auth.sessions.
    const { data: activeSessions, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .schema('auth')

    if (sessionError) throw sessionError

    // 3. Fetch session events history for anomaly detection
    const { data: eventHistory, error: historyError } = await supabaseAdmin
      .from('session_events')
      .select('ip, country, user_agent, created_at, session_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (historyError) throw historyError

    // 4. Enrich sessions with metadata and score them
    const enrichedSessions = activeSessions.map((session: any) => {
      // Find the specific event for this session_id
      const event = eventHistory?.find(e => e.session_id === session.id)
      
      const metadata = {
        ip: event?.ip || 'Unknown',
        country: event?.country || null,
        userAgent: event?.user_agent || 'Unknown',
        timestamp: session.created_at
      }

      // History for this specific scoring is everything EXCEPT the current event
      const historyForScoring = eventHistory?.filter(e => e.session_id !== session.id) || []
      const anomaly = calculateAnomalyScore(metadata, historyForScoring)

      return {
        id: session.id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        notAfter: session.not_after,
        metadata,
        anomaly
      }
    })

    return new Response(JSON.stringify({ sessions: enrichedSessions }), {
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

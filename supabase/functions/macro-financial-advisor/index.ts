import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function safeParseJSON(text: string) {
  try {
    const clean = text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean)
  } catch { return null }
}

async function getLatestDataHash(supabase: any, currency: string) {
  const { data } = await supabase
    .from('market_trends')
    .select('period, value')
    .eq('currency', currency)
    .order('period', { ascending: false })
    .limit(5)
  
  if (!data || data.length === 0) return 'no-data'
  return btoa(JSON.stringify(data))
}

async function getCachedInsight(supabase: any, region: string, currency: string, hash: string) {
  const { data } = await supabase
    .from('ai_insights_cache')
    .select('insight_json')
    .eq('region', region)
    .eq('currency', currency)
    .eq('data_version_hash', hash)
    .single()
  return data?.insight_json
}

async function saveCachedInsight(supabase: any, region: string, currency: string, hash: string, insight: any) {
  await supabase
    .from('ai_insights_cache')
    .upsert({
      region,
      currency,
      data_version_hash: hash,
      insight_json: insight,
      updated_at: new Date().toISOString()
    }, { onConflict: 'region,currency' })
}

// ─── AI Chain Helpers ──────────────────────────────────────────────────────

async function tryGemini(prompt: string, apiKey: string) {
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
  for (const mName of models) {
    try {
      console.log(`Trying Gemini: ${mName}`)
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/${mName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt + " Respond with raw JSON only." }] }]
        })
      })
      if (resp.ok) {
        const result = await resp.json()
        const text = result.candidates[0].content.parts[0].text
        const parsed = safeParseJSON(text)
        if (parsed) return { data: parsed, model: mName }
      }
    } catch (e) { console.error(`Gemini ${mName} failed:`, e.message) }
  }
  return null
}

async function tryGroq(prompt: string, apiKey: string) {
  try {
    console.log('Trying Groq (Llama 3)...')
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt + " Respond with raw JSON only." }],
        response_format: { type: 'json_object' }
      })
    })
    if (resp.ok) {
      const res = await resp.json()
      const parsed = safeParseJSON(res.choices[0].message.content)
      if (parsed) return { data: parsed, model: 'groq-llama3-70b' }
    }
  } catch (e) { console.error('Groq failed:', e.message) }
  return null
}

async function tryClaude(prompt: string, apiKey: string) {
  try {
    console.log('Trying Claude (Anthropic)...')
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt + " Respond with raw JSON only." }]
      })
    })
    if (resp.ok) {
      const res = await resp.json()
      const parsed = safeParseJSON(res.content[0].text)
      if (parsed) return { data: parsed, model: 'claude-3-5-sonnet' }
    }
  } catch (e) { console.error('Claude failed:', e.message) }
  return null
}

// ─── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { currency, region = 'Global' } = await req.json()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const currentHash = await getLatestDataHash(supabase, currency)
    const cached = await getCachedInsight(supabase, region, currency, currentHash)
    
    if (cached) {
      console.log(`Cache hit for ${region}/${currency}`)
      return new Response(JSON.stringify({ ...cached, _meta: { cached: true, hash: currentHash } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const groqKey = Deno.env.get('GROQ_API_KEY')
    const claudeKey = Deno.env.get('ANTHROPIC_API_KEY')

    const prompt = `Return a JSON object for ${region} (${currency}) economics. 
    Structure: { 
      "alerts": [{ "type": "warning"|"info", "message": "string" }], 
      "strategyShift": "string", 
      "categoryMultipliers": { "food": 1.0, "housing": 1.0, ... }, 
      "indicators": [{ "label": "string", "value": "string", "status": "up"|"down"|"stable", "source": "string", "category": "economic"|"consumer" }], 
      "rationale": "string" 
    }`

    let result = null
    let modelUsed = 'none'

    // 1. Gemini
    if (geminiKey) {
      const res = await tryGemini(prompt, geminiKey)
      if (res) { result = res.data; modelUsed = res.model }
    }

    // 2. Groq Fallback
    if (!result && groqKey) {
      const res = await tryGroq(prompt, groqKey)
      if (res) { result = res.data; modelUsed = res.model }
    }

    // 3. Claude Fallback
    if (!result && claudeKey) {
      const res = await tryClaude(prompt, claudeKey)
      if (res) { result = res.data; modelUsed = res.model }
    }

    // 4. Final Dynamic Heuristic Fallback
    if (!result) {
      console.warn('All AI services failed. Using Dynamic Heuristic Fallback.')
      
      const { data: rawTrends } = await supabase
        .from('market_trends')
        .select('*')
        .eq('currency', currency)
        .order('period', { ascending: false })

      const indicators: any[] = []
      const seriesGroups: Record<string, any[]> = {}
      ;(rawTrends ?? []).forEach((t: any) => {
        if (!seriesGroups[t.series_id]) seriesGroups[t.series_id] = []
        seriesGroups[t.series_id].push(t)
      })

      Object.values(seriesGroups).forEach(group => {
        if (group.length >= 2) {
          const latest = group[0]
          const previous = group[1]
          const diff = latest.value - previous.value
          indicators.push({
            label: latest.series_name,
            value: latest.value.toString(),
            status: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
            source: 'FRED / World Bank',
            category: latest.category || 'economic'
          })
        }
      })

      result = { 
        alerts: [{ type: 'info', message: 'Using live market data (Heuristic Analysis).' }], 
        strategyShift: 'Cautious: Monitor local inflation trends.', 
        categoryMultipliers: { food: 1.0, housing: 1.0, transport: 1.0, utilities: 1.0, healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0 }, 
        indicators, 
        rationale: `AI was unavailable, but we detected ${indicators.length} active market signals for ${region}.` 
      }
      modelUsed = 'heuristic-fallback'
    }

    await saveCachedInsight(supabase, region, currency, currentHash, result)

    return new Response(
      JSON.stringify({ ...result, _meta: { modelUsed, hash: currentHash } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})

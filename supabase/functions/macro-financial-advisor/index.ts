import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

/**
 * macro-financial-advisor
 * -----------------------
 * AI Intelligence Hub for StashFlow.
 * - Tries Gemini models in preference order.
 * - Falls back to Groq (Llama 3) if Gemini fails.
 * - NEW: Provides a static "Regional Fallback" if all AI services are down.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODELS_BY_PREFERENCE = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
]

// ─── Regional Static Fallbacks ───────────────────────────────────────────────
const REGIONAL_FALLBACKS: Record<string, any> = {
  'USA': {
    alerts: [{ type: 'info', message: 'US Inflation at 3.2% — consider high-yield savings.' }],
    strategyShift: 'Fed rates steady at 5.25% — keep fixed-rate debt.',
    categoryMultipliers: { housing: 1.05, food: 1.08, transport: 1.04, utilities: 1.10, healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0 },
    indicators: [
      { label: 'US CPI Inflation', value: '3.2%', status: 'up', source: 'BLS', category: 'economic' },
      { label: 'Fed Funds Rate', value: '5.25%', status: 'stable', source: 'FRED', category: 'economic' },
      { label: 'US GDP Growth', value: '2.1%', status: 'stable', source: 'BEA', category: 'economic' },
      { label: 'Unemployment', value: '3.9%', status: 'up', source: 'BLS', category: 'economic' },
      { label: 'Consumer Confidence', value: '104.7', status: 'down', source: 'Conference Board', category: 'consumer' },
      { label: 'Retail Sales', value: '+0.6%', status: 'up', source: 'Census Bureau', category: 'consumer' },
      { label: 'Median Rent', value: '$2,100', status: 'up', source: 'Zillow', category: 'consumer' },
      { label: 'Household Debt', value: 'High', status: 'up', source: 'Fed', category: 'consumer' },
    ],
    rationale: 'Using US regional baseline (BLS/BEA) as primary AI services are temporarily syncing.'
  },
  'Philippines': {
    alerts: [{ type: 'warning', message: 'PH CPI at 3.7% — food prices remain volatile.' }],
    strategyShift: 'BSP rate at 6.50% — avoid new high-interest variable debt.',
    categoryMultipliers: { housing: 1.0, food: 1.12, transport: 1.10, utilities: 1.15, healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0 },
    indicators: [
      { label: 'PH CPI YoY', value: '3.7%', status: 'up', source: 'PSA', category: 'economic' },
      { label: 'BSP Policy Rate', value: '6.50%', status: 'stable', source: 'BSP', category: 'economic' },
      { label: 'PH GDP Growth', value: '5.6%', status: 'up', source: 'PSA', category: 'economic' },
      { label: 'PH Unemployment', value: '4.5%', status: 'down', source: 'PSA', category: 'economic' },
      { label: 'PH Consumer Sent.', value: '-10.9', status: 'up', source: 'BSP', category: 'consumer' },
      { label: 'Rice Price Index', value: 'High', status: 'up', source: 'PSA', category: 'consumer' },
      { label: 'Household Debt', value: 'Moderate', status: 'stable', source: 'BSP', category: 'consumer' },
      { label: 'Rent Inflation', value: '4.2%', status: 'up', source: 'PSA', category: 'consumer' },
    ],
    rationale: 'Using Philippines baseline (PSA/BSP) as primary AI services are temporarily syncing.'
  },
  'Singapore': {
    alerts: [{ type: 'info', message: 'SG Core Inflation easing to 3.1%.' }],
    strategyShift: 'MAS maintaining SGD NEER slope — watch import costs.',
    categoryMultipliers: { housing: 1.10, food: 1.05, transport: 1.08, utilities: 1.05, healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0 },
    indicators: [
      { label: 'SG Core Inflation', value: '3.1%', status: 'down', source: 'MAS', category: 'economic' },
      { label: 'SG GDP Growth', value: '2.7%', status: 'up', source: 'MTI', category: 'economic' },
      { label: 'SG Unemployment', value: '2.0%', status: 'stable', source: 'MOM', category: 'economic' },
      { label: 'SORA Rate', value: '3.65%', status: 'stable', source: 'MAS', category: 'economic' },
      { label: 'SG Retail Sales', value: '+1.3%', status: 'up', source: 'SingStat', category: 'consumer' },
      { label: 'COE Prices', value: 'Record High', status: 'up', source: 'LTA', category: 'consumer' },
      { label: 'Rental Index', value: '154.2', status: 'down', source: 'URA', category: 'consumer' },
      { label: 'Consumer Confidence', value: 'Stable', status: 'stable', source: 'MTI', category: 'consumer' },
    ],
    rationale: 'Using Singapore baseline (MAS/SingStat) as primary AI services are temporarily syncing.'
  }
}

const GLOBAL_DEFAULT = REGIONAL_FALLBACKS['USA']

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveModels(apiKey: string) {
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`)
    if (!resp.ok) return MODELS_BY_PREFERENCE
    const data = await resp.json()
    const names = (data.models ?? []).map((m: any) => m.name.replace('models/', ''))
    return MODELS_BY_PREFERENCE.filter(m => names.includes(m))
  } catch { return MODELS_BY_PREFERENCE }
}

function safeParseJSON(text: string) {
  try {
    // Clean markdown blocks if present
    const clean = text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean)
  } catch { return null }
}

// ─── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { currency, region = 'Global' } = await req.json()
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const groqKey = Deno.env.get('GROQ_API_KEY')
    
    if (!geminiKey && !groqKey) {
      throw new Error('No AI API keys configured (GEMINI_API_KEY or GROQ_API_KEY)')
    }

    const now = new Date()
    const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    
    const prompt = `Return a JSON object for ${region} (${currency}) economics in ${monthYear}. 
    Exact structure: {
      "alerts": [{"type":"warning"|"info", "message":"string"}],
      "strategyShift": "string",
      "categoryMultipliers": {"housing":1.0,"food":1.0,"transport":1.0,"utilities":1.0,"healthcare":1.0,"entertainment":1.0,"education":1.0,"personal":1.0,"other":1.0},
      "indicators": [{"label":"string","value":"string","status":"up"|"down"|"stable","source":"string","category":"economic"|"consumer"}],
      "rationale": "string"
    }. Requirements: Exactly 8 indicators (4 econ, 4 cons). Real numeric values.`

    let macroData: any = null
    let modelUsed = 'none'

    // 1. Try Gemini
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const models = await resolveModels(geminiKey)
      for (const mName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: mName, generationConfig: { responseMimeType: 'application/json' } })
          const result = await model.generateContent(prompt)
          macroData = safeParseJSON(result.response.text())
          if (macroData) { modelUsed = `gemini-${mName}`; break }
        } catch (e) { console.error(`Gemini ${mName} failed:`, e.message) }
      }
    }

    // 2. Try Groq Fallback
    if (!macroData && groqKey) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          })
        })
        if (resp.ok) {
          const res = await resp.json()
          macroData = safeParseJSON(res.choices[0].message.content)
          if (macroData) modelUsed = 'groq-llama3-70b'
        }
      } catch (e) { console.error('Groq failed:', e.message) }
    }

    // 3. Final Static Fallback (NEVER return empty)
    if (!macroData) {
      console.warn(`All AI services failed for region: ${region}. Using static fallback.`)
      macroData = REGIONAL_FALLBACKS[region] || GLOBAL_DEFAULT
      modelUsed = 'static-fallback'
    }

    return new Response(
      JSON.stringify({ ...macroData, _meta: { modelUsed, timestamp: now.toISOString() } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})

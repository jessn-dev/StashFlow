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

// ─── Heuristic Parser (Actual Work Fallback) ────────────────────────────────

function heuristicParse(text: string) {
  const result: any = {
    inferred_type: "unknown",
    extracted_data: {}
  }

  if (/payslip|pay stub|salary advice/i.test(text)) result.inferred_type = "payslip"
  else if (/loan|mortgage|amortization|principal/i.test(text)) result.inferred_type = "loan"
  else if (/receipt|invoice|bill|statement/i.test(text)) result.inferred_type = "bill"
  else if (/offer letter|employment certificate|contract/i.test(text)) result.inferred_type = "coe_offer"

  const amountMatch = text.match(/(?:total|amount|principal|net pay|gross pay)[:\s]*([\d,]+\.?\d*)/i)
  if (amountMatch) result.extracted_data.amount = parseFloat(amountMatch[1].replace(/,/g, ''))

  const dateMatch = text.match(/(?:date|period|due date)[:\s]*(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})/i)
  if (dateMatch) result.extracted_data.date = dateMatch[1]

  const rateMatch = text.match(/(?:rate|interest)[:\s]*([\d.]+)%/i)
  if (rateMatch) result.extracted_data.interest_rate = parseFloat(rateMatch[1])

  return result
}

// ─── AI Extraction ──────────────────────────────────────────────────────────

async function tryGemini(fileBuffer: ArrayBuffer, mimeType: string, apiKey: string) {
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
  const prompt = `Analyze this financial document. Respond with raw JSON only: { "inferred_type": "payslip"|"loan"|"bill"|"coe_offer", "extracted_data": { "amount": number, "currency": string, "date": "YYYY-MM-DD" } }`

  for (const mName of models) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/${mName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { data: btoa(String.fromCharCode(...new Uint8Array(fileBuffer))), mimeType } }] }]
        })
      })
      if (resp.ok) {
        const result = await resp.json()
        const parsed = safeParseJSON(result.candidates[0].content.parts[0].text)
        if (parsed) return { data: parsed, model: mName }
      }
    } catch (e) { console.error(`Gemini ${mName} failed:`, e.message) }
  }
  return null
}

async function tryClaude(fileBuffer: ArrayBuffer, mimeType: string, apiKey: string) {
  try {
    console.log('Trying Claude (Multimodal)...')
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this financial document. Respond with raw JSON only.' },
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: btoa(String.fromCharCode(...new Uint8Array(fileBuffer))) } }
          ]
        }]
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
    const { file_url, mime_type, raw_text } = await req.json()
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const claudeKey = Deno.env.get('ANTHROPIC_API_KEY')
    
    let result = null
    let modelUsed = 'none'

    // Fetch buffer for multimodal
    let buffer = null
    if (file_url && (mime_type.startsWith('image/') || mime_type === 'application/pdf')) {
      try {
        const fileResp = await fetch(file_url)
        buffer = await fileResp.arrayBuffer()
      } catch (e) { console.error('Buffer fetch failed:', e.message) }
    }

    // 1. Gemini
    if (geminiKey && buffer) {
      const res = await tryGemini(buffer, mime_type, geminiKey)
      if (res) { result = res.data; modelUsed = res.model }
    }

    // 2. Claude Fallback
    if (!result && claudeKey && buffer) {
      const res = await tryClaude(buffer, mime_type, claudeKey)
      if (res) { result = res.data; modelUsed = res.model }
    }

    // 3. Heuristic Fallback
    if (!result) {
      console.warn('AI failed. Using Heuristic Backend.')
      result = heuristicParse(raw_text || "")
      modelUsed = 'heuristic-backend'
    }

    return new Response(
      JSON.stringify({ ...result, _meta: { modelUsed } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})

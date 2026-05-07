import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1"
import {
  inspectFile,
  extractPdfText,
  runVisionOCR,
  parseLoan,
  scoreResult,
} from "../_shared/document-parser/index.ts"
import type { ProcessingError, ExtractedLoanData, MultiLoanExtractedData } from "../_shared/document-parser/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

const WEBHOOK_SECRET        = Deno.env.get('PARSE_LOAN_WEBHOOK_SECRET')
const GEMINI_API_KEY        = Deno.env.get('GEMINI_API_KEY')
const GROQ_API_KEY          = Deno.env.get('GROQ_API_KEY')
const ANTHROPIC_API_KEY     = Deno.env.get('ANTHROPIC_API_KEY')
const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY')

// Confidence thresholds — tune based on observed accuracy
const THRESHOLD_FREE = 0.85   // PDF.js + regex: high enough to skip OCR and AI
const THRESHOLD_OCR  = 0.70   // OCR output: good enough to skip AI

const AI_PROMPT = `You are a financial document parser. Extract all loan details from this document.
Some documents contain multiple loans (e.g. in a summary table). Identify each distinct loan.
Return ONLY a valid JSON object with a "loans" array containing objects with these fields (use null for any field you cannot find):
{
  "loans": [
    {
      "name": string | null,
      "principal": number | null,
      "currency": string | null,
      "interest_rate": number | null,
      "duration_months": number | null,
      "installment_amount": number | null,
      "lender": string | null,
      "start_date": "YYYY-MM-DD" | null,
      "interest_type": "Standard Amortized" | "Interest-Only" | "Add-on Interest" | "Fixed Principal" | null,
      "interest_basis": "30/360" | "Actual/360" | "Actual/365" | null,
      "inferred_type": string | null
    }
  ]
}
No explanation. No markdown. Return only the JSON object.`

type ProcessingStatus = 'pending' | 'processing' | 'success' | 'error_rate_limit' | 'error_generic'

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function withBackoff<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && err.message.includes('429')
      if (!isRateLimit || attempt === maxAttempts) throw err
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
    }
  }
  throw new Error('Max retries exceeded')
}

async function extractWithGemini(base64Data: string, mimeType: string): Promise<string> {
  const res = await withBackoff(async () => {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: AI_PROMPT },
            ],
          }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0 },
        }),
      }
    )
    if (r.status === 429) throw new Error('429 rate limit')
    if (!r.ok) {
      const body = await r.text()
      throw new Error(`Gemini error ${r.status}: ${body}`)
    }
    return r
  })
  const data = await res.json()
  // deno-lint-ignore no-explicit-any
  return (data as any).candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function extractWithGroq(text: string): Promise<string> {
  const truncated = text.slice(0, 50_000)
  const res = await withBackoff(async () => {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: AI_PROMPT },
          { role: 'user', content: `Document text:\n${truncated}` },
        ],
        max_tokens: 1024,
        temperature: 0,
      }),
    })
    if (r.status === 429) throw new Error('429 rate limit')
    if (!r.ok) {
      const body = await r.text()
      throw new Error(`Groq error ${r.status}: ${body}`)
    }
    return r
  })
  const data = await res.json()
  // deno-lint-ignore no-explicit-any
  return (data as any).choices?.[0]?.message?.content ?? ''
}

async function extractWithClaude(base64Data: string, mimeType: string): Promise<string> {
  const res = await withBackoff(async () => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document' as any,
              source: {
                type: 'base64',
                media_type: mimeType as any,
                data: base64Data,
              },
            },
            { type: 'text', text: AI_PROMPT },
          ],
        }],
      }),
    })
    if (r.status === 429) throw new Error('429 rate limit')
    if (!r.ok) {
      const body = await r.text()
      throw new Error(`Claude error ${r.status}: ${body}`)
    }
    return r
  })
  const data = await res.json()
  // deno-lint-ignore no-explicit-any
  return (data as any).content?.[0]?.text ?? ''
}

function parseJsonFromAiResponse(raw: string): MultiLoanExtractedData | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    if (parsed.loans && Array.isArray(parsed.loans)) {
      return parsed as MultiLoanExtractedData
    }
    // Backward compatibility or malformed array
    if (parsed.principal) {
      return { loans: [parsed as ExtractedLoanData] }
    }
    return null
  } catch {
    return null
  }
}

function compareExtractions(det: ExtractedLoanData, ai: ExtractedLoanData) {
  const fields = Object.keys(det) as (keyof ExtractedLoanData)[]
  const diffs: any = {}
  fields.forEach(f => {
    if (String(det[f]) !== String(ai[f])) {
      diffs[f] = { free: det[f], ai: ai[f] }
    }
  })
  return diffs
}

async function storeSuccess(
  supabase: SupabaseClient,
  documentId: string,
  data: MultiLoanExtractedData,
  source: string,
): Promise<void> {
  await supabase.from('documents').update({
    extracted_data: data,
    inferred_type: data.loans?.[0]?.inferred_type ?? 'Multi-Loan',
    processing_status: 'success' satisfies ProcessingStatus,
    extraction_source: source,
    processing_error: null,
  }).eq('id', documentId)

  // [Phase 11] Audit log success
  await supabase.from('system_audit_logs').insert({
    event_type: 'document_parse',
    action: 'process_success',
    severity: 'info',
    metadata: { documentId, source }
  })
}

async function storeFailed(
  supabase: SupabaseClient,
  documentId: string,
  error: ProcessingError,
): Promise<void> {
  const status: ProcessingStatus = error.code === 'VISION_QUOTA_EXCEEDED'
    ? 'error_rate_limit'
    : 'error_generic'
  await supabase.from('documents').update({
    processing_status: status,
    processing_error: error,
  }).eq('id', documentId)

  // [Phase 11] Audit log failure
  await supabase.from('system_audit_logs').insert({
    event_type: 'document_parse',
    action: 'process_failed',
    severity: status === 'error_rate_limit' ? 'low' : 'high',
    metadata: { documentId, error_code: error.code, stage: error.stage }
  })
}

async function processDocument(supabase: SupabaseClient, documentId: string, password?: string): Promise<void> {
  const log = (step: string, detail?: unknown) =>
    console.log(`[parse-loan-document] [${documentId}] ${step}`, detail ?? '')
  const fail = (step: string, err: unknown) => {
    console.error(`[parse-loan-document] [${documentId}] FAILED at: ${step}`, err)
    throw err
  }

  log('start', { hasPassword: !!password })

  // Fetch record — never trust webhook payload for file paths
  log('fetch-record')
  const { data: docRecord, error: fetchError } = await supabase
    .from('documents')
    .select('user_id, storage_path, content_type, file_size, processing_status, processing_attempts')
    .eq('id', documentId)
    .single()

  if (fetchError || !docRecord) fail('fetch-record', fetchError ?? new Error('Document not found'))

  // [Phase 11] Create Audit Log entry
  await supabase.from('system_audit_logs').insert({
    user_id: docRecord.user_id,
    event_type: 'document_parse',
    action: 'process_started',
    severity: 'info',
    metadata: { documentId, content_type: docRecord.content_type }
  })

  // Idempotency — don't reprocess completed documents
  if (docRecord.processing_status === 'success') {
    log('already-completed — skip')
    return
  }

  // Track attempt
  await supabase.from('documents').update({
    processing_status: 'processing' satisfies ProcessingStatus,
    processing_attempts: (docRecord.processing_attempts ?? 0) + 1,
    last_processed_at: new Date().toISOString(),
  }).eq('id', documentId)

  // Early validation — reject before paying storage egress costs
  const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'image/webp',
  ])
  const declaredMime = (docRecord.content_type as string | null) ?? ''
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
    log('mime-rejected', { content_type: declaredMime })
    await storeFailed(supabase, documentId, {
      stage: 'inspect',
      code: 'UNSUPPORTED_TYPE',
      message: `Unsupported file type: ${declaredMime}. Accepted: PDF, JPEG, PNG, TIFF, WebP.`,
      retryable: false,
    })
    return
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
  const declaredSize = docRecord.file_size as number | null
  if (declaredSize !== null && declaredSize > MAX_FILE_SIZE) {
    log('size-rejected', { file_size: declaredSize, limit: MAX_FILE_SIZE })
    await storeFailed(supabase, documentId, {
      stage: 'inspect',
      code: 'FILE_TOO_LARGE',
      message: `File size ${declaredSize} bytes exceeds the 5 MB limit.`,
      retryable: false,
    })
    return
  }

  log('storage-download', { path: docRecord.storage_path })
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('user_documents')
    .download(docRecord.storage_path)

  if (downloadError || !fileData) {
    fail('storage-download', new Error(`Storage download failed: ${downloadError?.message ?? 'no data'}`))
  }

  const contentType = (docRecord.content_type as string | null) ?? 'application/pdf'
  const buffer = await fileData!.arrayBuffer()

  // [1] Inspect
  log('inspect', { contentType })
  const inspectResult = inspectFile(contentType)
  if (!inspectResult.ok) {
    log('inspect-failed', inspectResult.error)
    await storeFailed(supabase, documentId, inspectResult.error)
    return
  }
  const { isPDF, isImage } = inspectResult.value

  let text = ''

  // [2] PDF.js extraction — free path
  if (isPDF) {
    log('extract-pdf')
    const extractResult = await extractPdfText(buffer, password)
    if (extractResult.ok) {
      text = extractResult.value
      log('extract-pdf-done', { chars: text.length })
    } else {
      log('extract-pdf-failed', extractResult.error)
      
      // Explicitly catch password protection failures from unpdf/pdf.js
      if (extractResult.error.message.toLowerCase().includes('password')) {
         await storeFailed(supabase, documentId, {
           stage: 'extract',
           code: 'PASSWORD_REQUIRED',
           message: 'This document is password protected.',
           retryable: false,
         })
         return
      }
      // non-fatal — fall through to OCR
    }
  }

  // [3] Deterministic parse
  log('parse-deterministic')
  let parsed = parseLoan(text)
  let confidence = scoreResult(parsed)
  log('parse-deterministic-done', { confidence, threshold: THRESHOLD_FREE })

  // [4] High-confidence gate — free path done
  if (confidence >= THRESHOLD_FREE) {
    log('confidence-gate-pass', { confidence, required: THRESHOLD_FREE, source: 'pdfjs' })
    await storeSuccess(supabase, documentId, { loans: [parsed] }, 'pdfjs')
    return
  } else {
    log('confidence-gate-fail', { confidence, required: THRESHOLD_FREE, source: 'pdfjs' })
  }

  // [5] OCR — only for images (PNG/JPG). PDFs that failed deterministic parsing should skip to AI.
  const isOcrSupportedImage = contentType === 'image/png' || contentType === 'image/jpeg' || contentType === 'image/jpg'
  
  log('ocr-decision', { isPDF, isImage, isOcrSupportedImage, confidence, hasApiKey: !!GOOGLE_VISION_API_KEY })

  if (isOcrSupportedImage && GOOGLE_VISION_API_KEY) {
    log('extract-ocr', { type: contentType })
    const base64 = arrayBufferToBase64(buffer)
    const ocrResult = await runVisionOCR(base64, GOOGLE_VISION_API_KEY)

    if (ocrResult.ok) {
      log('extract-ocr-done', { chars: ocrResult.value.length })
      
      // [6] Re-parse with OCR text
      parsed = parseLoan(ocrResult.value)
      confidence = scoreResult(parsed)
      log('parse-ocr-done', { confidence, threshold: THRESHOLD_OCR })

      if (confidence >= THRESHOLD_OCR) {
        log('confidence-gate-pass', { confidence, required: THRESHOLD_OCR, source: 'vision' })
        await storeSuccess(supabase, documentId, { loans: [parsed] }, 'vision')
        return
      } else {
        log('confidence-gate-fail', { confidence, required: THRESHOLD_OCR, source: 'vision' })
      }
    } else {
      log('ocr-failed', ocrResult.error)
      // non-fatal — fall through to AI
    }
  }

  // [7] AI fallback chain — Multi-model resilience
  log('ai-fallback-starting', { confidence })
  const aiInputText = text.length > 200 ? text : ''
  let rawAiResponse = ''
  let aiModelUsed = ''

  const providers = [
    {
      name: 'groq',
      model: 'llama-3.3-70b-versatile',
      active: !!GROQ_API_KEY && !!aiInputText,
      run: () => extractWithGroq(aiInputText),
    },
    {
      name: 'gemini',
      model: 'gemini-1.5-flash',
      active: !!GEMINI_API_KEY,
      run: () => extractWithGemini(arrayBufferToBase64(buffer), contentType),
    },
    {
      name: 'claude',
      model: 'claude-3-5-haiku-latest',
      active: !!ANTHROPIC_API_KEY,
      run: () => extractWithClaude(arrayBufferToBase64(buffer), contentType),
    }
  ]

  for (const provider of providers) {
    if (!provider.active) continue
    
    log('ai-attempt', { provider: provider.name, model: provider.model })
    try {
      rawAiResponse = await provider.run()
      if (rawAiResponse) {
        aiModelUsed = provider.model
        log('ai-success', { provider: provider.name, chars: rawAiResponse.length })
        break
      }
    } catch (err) {
      log('ai-provider-failed', { provider: provider.name, error: String(err) })
      // If it's a rate limit, the loop continues to the next provider
      continue
    }
  }

  if (!rawAiResponse) {
    const error: ProcessingError = {
      stage: 'ai',
      code: 'ALL_PROVIDERS_FAILED',
      message: 'Failed to get a response from Groq, Gemini, or Claude. Check rate limits or API keys.',
      retryable: true,
    }
    await storeFailed(supabase, documentId, error)
    return
  }

  // [8] Parse + validate AI JSON
  log('ai-parsing-json', { model: aiModelUsed })
  const aiExtracted = parseJsonFromAiResponse(rawAiResponse)
  
  if (!aiExtracted) {
    const validateError: ProcessingError = {
      stage: 'validate',
      code: 'INVALID_SCHEMA',
      message: `No valid JSON in AI response.`,
      retryable: true,
    }
    log('validate-failed', { validateError })
    await storeFailed(supabase, documentId, validateError)
    return
  }

  // Audit Accuracy: Compare Free vs AI (if both have data)
  if (parsed && aiExtracted.loans?.[0]) {
    const diffs = compareExtractions(parsed, aiExtracted.loans[0])
    const mismatchFields = Object.keys(diffs)
    if (mismatchFields.length > 0) {
      log('accuracy-audit-discrepancies-detected', { fields: mismatchFields })
    } else {
      log('accuracy-audit-match', 'Free parser and AI returned identical results!')
    }
  }

  log('done', { source: 'ai', provider: aiModelUsed.includes('gemini') ? 'gemini' : 'groq' })
  await storeSuccess(supabase, documentId, aiExtracted, 'ai')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = req.headers.get('x-webhook-secret')
  const password = req.headers.get('x-document-password') ?? undefined
  
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    // If no secret, check for Auth header (manual invocation from client)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Forbidden', { status: 403 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let documentId: string | null = null

  try {
    const payload = await req.json()
    const record = payload.record ?? payload
    documentId = record.id as string

    if (!documentId) {
      return new Response('Missing document id', { status: 400 })
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Processing timeout')), 120_000)
    )

    await Promise.race([processDocument(supabase, documentId, password), timeout])

    return new Response(JSON.stringify({ success: true, documentId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const isRateLimit = err instanceof Error && err.message.includes('429')
    const status: ProcessingStatus = isRateLimit ? 'error_rate_limit' : 'error_generic'

    if (documentId) {
      await supabase.from('documents').update({ processing_status: status }).eq('id', documentId)
    }

    console.error('[parse-loan-document] unhandled error', err)

    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

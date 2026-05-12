import { createClient } from "@supabase/supabase-js"
import * as Sentry from "npm:@sentry/deno"
import { inspectFile, validateMagicBytes } from "../_shared/document-parser/src/mod.ts"
import type { ProcessingError, MultiLoanExtractedData, UnifiedDocumentResult } from "../_shared/document-parser/src/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-document-password',
}

const SENTRY_DSN          = Deno.env.get('SENTRY_DSN')
const WEBHOOK_SECRET      = Deno.env.get('PARSE_LOAN_WEBHOOK_SECRET')
const PYTHON_BACKEND_URL  = Deno.env.get('PYTHON_BACKEND_URL') || 'http://host.docker.internal:8008'

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
  })
}

type ProcessingStatus = 'pending' | 'processing' | 'success' | 'error_rate_limit' | 'error_generic'

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

async function auditLog(
  supabase: SupabaseClient,
  userId: string | undefined,
  eventType: string,
  action: string,
  metadata: any,
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical' = 'info'
): Promise<void> {
  const { error } = await supabase.from('system_audit_logs').insert({
    user_id: userId,
    event_type: eventType,
    action,
    metadata,
    severity
  })
  if (error) console.error('[parse-document] auditLog failed:', error)
}

async function storeSuccess(
  supabase: SupabaseClient,
  documentId: string,
  data: any,
  inferredType: string,
  ocrTelemetry?: any,
): Promise<void> {
  const { data: doc } = await supabase.from('documents').select('user_id').eq('id', documentId).single()
  
  const { error } = await supabase.from('documents').update({
    extracted_data: data,
    inferred_type: inferredType,
    processing_status: 'success' satisfies ProcessingStatus,
    extraction_source: 'ai',
    processing_error: null,
    ocr_telemetry: ocrTelemetry,
  }).eq('id', documentId)

  if (error) {
    console.error(`[parse-document] [${documentId}] storeSuccess failed:`, error)
    throw error
  }

  await auditLog(supabase, doc?.user_id, 'document.parse', 'completed', { document_id: documentId, type: inferredType })
}

async function storeFailed(
  supabase: SupabaseClient,
  documentId: string,
  error: ProcessingError,
): Promise<void> {
  const { data: doc } = await supabase.from('documents').select('user_id').eq('id', documentId).single()

  const { error: updateError } = await supabase.from('documents').update({
    processing_status: 'error_generic' satisfies ProcessingStatus,
    processing_error: error,
  }).eq('id', documentId)

  if (updateError) {
    console.error(`[parse-document] [${documentId}] storeFailed failed:`, updateError)
  }

  await auditLog(
    supabase, 
    doc?.user_id, 
    'document.parse', 
    'failed', 
    { document_id: documentId, error_code: error.code, stage: error.stage },
    error.retryable ? 'low' : 'medium'
  )
}

async function processUnified(
  supabase: SupabaseClient, 
  documentId: string,
  password?: string | null
): Promise<void> {
  const log = (step: string, detail?: unknown) =>
    console.log(`[parse-document] [${documentId}] ${step}`, detail ?? '')
  const fail = (step: string, err: unknown) => {
    console.error(`[parse-document] [${documentId}] FAILED at: ${step}`, err)
    throw err
  }

  log('start', { documentId })

  // Fetch record
  const { data: docRecord, error: fetchError } = await supabase
    .from('documents')
    .select('user_id, storage_path, content_type, file_size, processing_status, processing_attempts')
    .eq('id', documentId)
    .single()

  if (fetchError || !docRecord) fail('fetch-record', fetchError ?? new Error('Document not found'))

  if (docRecord.processing_status === 'success') {
    log('already-completed — skip')
    return
  }

  await auditLog(supabase, docRecord.user_id, 'document.parse', 'started', { document_id: documentId })

  // Track attempt
  await supabase.from('documents').update({
    processing_status: 'processing' satisfies ProcessingStatus,
    processing_attempts: (docRecord.processing_attempts ?? 0) + 1,
    last_processed_at: new Date().toISOString(),
  }).eq('id', documentId)

  // Validation
  const contentType = (docRecord.content_type as string | null) ?? 'application/pdf'
  const inspectResult = inspectFile(contentType)
  if (!inspectResult.ok) {
    log('inspect-failed', inspectResult.error)
    await storeFailed(supabase, documentId, inspectResult.error)
    return
  }

  log('storage-download', { path: docRecord.storage_path })
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('user_documents')
    .download(docRecord.storage_path)

  if (downloadError || !fileData) {
    fail('storage-download', new Error(`Storage download failed: ${downloadError?.message ?? 'no data'}`))
  }

  // [0] Magic Bytes Validation
  const buffer = await fileData.arrayBuffer()
  const isMagicValid = validateMagicBytes(buffer, contentType)
  if (!isMagicValid) {
    log('magic-bytes-failed', { contentType })
    await storeFailed(supabase, documentId, {
      stage: 'inspect',
      code: 'INVALID_MAGIC_BYTES',
      message: 'The file content does not match its type. Please upload a valid PDF.',
      retryable: false,
    })
    return
  }

  // [1] Call Python Backend for ASYNC Processing
  log('python-enqueue-start', { url: PYTHON_BACKEND_URL })
  
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/v1/documents/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        storage_path: docRecord.storage_path,
        password: password
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Python backend error ${res.status}: ${errorText}`)
    }

    const enqueueResult = await res.json()
    log('python-enqueue-success', { job_id: enqueueResult.job_id })

    // We don't store success here anymore. 
    // The worker will call document-processed-webhook when done.
    log('done-enqueued')

  } catch (err) {
    log('python-enqueue-failed', String(err))
    await storeFailed(supabase, documentId, {
      stage: 'extract',
      code: 'PYTHON_ENQUEUE_FAILED',
      message: `Intelligence service failed to enqueue: ${String(err)}`,
      retryable: true,
    })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = req.headers.get('x-webhook-secret')
  const secretOk = !WEBHOOK_SECRET || secret === WEBHOOK_SECRET
  const authOk   = !!req.headers.get('Authorization')
  if (!secretOk && !authOk) return new Response('Forbidden', { status: 403 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const payload = await req.json()
    const record = payload.record ?? payload
    const documentId = record.id as string

    if (!documentId) return new Response('Missing document id', { status: 400 })

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Processing timeout')), 180_000)
    )

    const password = req.headers.get('x-document-password')
    await Promise.race([processUnified(supabase, documentId, password), timeout])

    return new Response(JSON.stringify({ success: true, documentId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    console.error('[parse-document] unhandled error', err)
    if (SENTRY_DSN) Sentry.captureException(err)
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

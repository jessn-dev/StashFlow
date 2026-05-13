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
    tracesSampleRate: 1,
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

  // [1] Call Python Backend
  try {
    const unifiedResult = await callPythonBackend(buffer, contentType, password)
    log('python-processing-success', { type: unifiedResult.document_type, confidence: unifiedResult.confidence })

    if (unifiedResult.document_type === 'LOAN' && unifiedResult.loan_data) {
        await handleLoanExtraction(supabase, documentId, unifiedResult)
    } else if (unifiedResult.document_type === 'BANK_STATEMENT' && unifiedResult.statement_data) {
        await handleBankStatementExtraction(supabase, documentId, unifiedResult)
    } else {
        throw new Error(`Unsupported or unknown document type: ${unifiedResult.document_type}`)
    }
    log('done')
  } catch (err) {
    log('processing-failed', String(err))
    await storeFailed(supabase, documentId, {
      stage: 'extract',
      code: 'PYTHON_ENQUEUE_FAILED',
      message: `Intelligence service failed to enqueue: ${String(err)}`,
      retryable: true,
    })
  }
}

/**
 * Forwards the document buffer to the Python backend for unified AI processing.
 * 
 * @param buffer - Raw file content.
 * @param contentType - MIME type of the file.
 * @param password - Optional password for encrypted PDFs.
 * @returns Unified processing result from the AI service.
 */
async function callPythonBackend(buffer: ArrayBuffer, contentType: string, password?: string | null): Promise<UnifiedDocumentResult> {
  const correlationId = crypto.randomUUID()
  const formData = new FormData()
  formData.append('file', new Blob([buffer], { type: contentType }), 'document.pdf')
  if (password) formData.append('password', password)

  // PSEUDOCODE: AI Service Communication
  // 1. Prepare multi-part form data with file and optional password.
  // 2. Attach correlation ID for tracing.
  // 3. POST to Python backend and parse response.

  const res = await fetch(`${PYTHON_BACKEND_URL}/api/v1/documents/process`, {
    method: 'POST',
    headers: {
      'X-Correlation-ID': correlationId,
    },
    body: formData,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Python backend error ${res.status}: ${errorText}`)
  }

  return await res.json()
}

/**
 * Validates and formats extracted loan data before storing it.
 * 
 * @param supabase - Supabase client instance.
 * @param documentId - UUID of the document record.
 * @param result - Raw result from the AI service.
 */
async function handleLoanExtraction(supabase: SupabaseClient, documentId: string, result: UnifiedDocumentResult): Promise<void> {
    const loan = result.loan_data!
    const validationErrors: string[] = []
    const confidenceThreshold = 0.6
    const isLowConfidence = (result.confidence ?? 0) < confidenceThreshold

    // PSEUDOCODE: Loan Validation & Storage
    // 1. Perform financial sanity checks (principal > 0, etc.).
    // 2. Check AI confidence against threshold.
    // 3. Map raw AI output to internal MultiLoanExtractedData schema.
    // 4. Store successful extraction with validation metadata.

    if (isLowConfidence) validationErrors.push(`Low AI confidence: ${result.confidence}`)
    if (loan.principal <= 0) validationErrors.push('Principal must be greater than 0')
    if (loan.interest_rate < 0 || loan.interest_rate > 100) validationErrors.push('Interest rate must be between 0 and 100')
    if (loan.duration_months <= 0) validationErrors.push('Duration must be greater than 0 months')
    if (!loan.name) validationErrors.push('Loan name/lender is missing')

    const formattedData: MultiLoanExtractedData = {
      loans: [
        {
          name: loan.name,
          principal: loan.principal,
          currency: loan.currency || 'USD',
          interest_rate: loan.interest_rate,
          duration_months: loan.duration_months,
          installment_amount: loan.installment_amount,
          lender: loan.lender,
          start_date: loan.start_date || null,
          interest_type: loan.interest_type || 'Standard Amortized',
          interest_basis: null,
          inferred_type: loan.interest_type || 'Loan',
        }
      ]
    }
    
    await storeSuccess(supabase, documentId, {
        ...formattedData,
        validation: {
            confidence: result.confidence,
            errors: validationErrors,
            requires_verification: isLowConfidence || validationErrors.length > 0,
            processed_at: new Date().toISOString()
        }
    }, 'Loan', result.ocr_telemetry)
}

/**
 * Validates and formats extracted bank statement data before storing it.
 * 
 * @param supabase - Supabase client instance.
 * @param documentId - UUID of the document record.
 * @param result - Raw result from the AI service.
 */
async function handleBankStatementExtraction(supabase: SupabaseClient, documentId: string, result: UnifiedDocumentResult): Promise<void> {
    const statement = result.statement_data!
    const validationErrors: string[] = []
    const isLowConfidence = (result.confidence ?? 0) < 0.6

    // PSEUDOCODE: Statement Validation & Storage
    // 1. Verify that transactions were successfully parsed.
    // 2. Check AI confidence.
    // 3. Store result with validation metadata.

    if (isLowConfidence) validationErrors.push(`Low AI confidence: ${result.confidence}`)
    if (!statement.transactions || statement.transactions.length === 0) {
        validationErrors.push('No transactions found in statement')
    }

    await storeSuccess(supabase, documentId, {
        ...statement,
        validation: {
            confidence: result.confidence,
            errors: validationErrors,
            requires_verification: isLowConfidence || validationErrors.length > 0,
            processed_at: new Date().toISOString()
        }
    }, 'Bank Statement', result.ocr_telemetry)
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

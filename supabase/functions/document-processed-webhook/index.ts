import { createClient } from "@supabase/supabase-js"
import * as Sentry from "npm:@sentry/deno"
import type { MultiLoanExtractedData } from "../_shared/document-parser/src/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

const SENTRY_DSN     = Deno.env.get('SENTRY_DSN')
const WEBHOOK_SECRET = Deno.env.get('PARSE_LOAN_WEBHOOK_SECRET')

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
  })
}

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
  if (error) console.error('[document-processed-webhook] auditLog failed:', error)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = req.headers.get('x-webhook-secret')
  const secretOk = !WEBHOOK_SECRET || secret === WEBHOOK_SECRET
  if (!secretOk) return new Response('Forbidden', { status: 403 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const payload = await req.json()
    const { document_id, result, error: processing_error } = payload

    if (!document_id) return new Response('Missing document_id', { status: 400 })

    const log = (step: string, detail?: unknown) =>
      console.log(`[document-processed-webhook] [${document_id}] ${step}`, detail ?? '')

    // 1. Fetch document
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('user_id, file_name')
      .eq('id', document_id)
      .single()

    if (fetchError || !doc) {
        log('fetch-failed', fetchError)
        return new Response('Document not found', { status: 404 })
    }

    // 2. Handle Processing Error from Worker
    if (processing_error) {
        log('worker-reported-error', processing_error)
        await supabase.from('documents').update({
            processing_status: 'error_generic',
            processing_error: {
                stage: 'extract',
                code: 'WORKER_ERROR',
                message: processing_error,
                retryable: true
            }
        }).eq('id', document_id)
        
        await auditLog(supabase, doc.user_id, 'document.parse', 'failed', { document_id, error: processing_error }, 'medium')
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Process Success Result
    log('processing-result', { type: result.document_type, confidence: result.confidence })

    const validationErrors: string[] = []
    const confidenceThreshold = 0.6
    const isLowConfidence = (result.confidence ?? 0) < confidenceThreshold

    if (isLowConfidence) {
      validationErrors.push(`Low AI confidence: ${result.confidence}`)
    }

    let inferredType = 'Unknown'
    let finalData = null

    if (result.document_type === 'LOAN' && result.loan_data) {
        inferredType = 'Loan'
        const loan = result.loan_data
        
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
        
        finalData = {
            ...formattedData,
            validation: {
                confidence: result.confidence,
                errors: validationErrors,
                requires_verification: isLowConfidence || validationErrors.length > 0,
                processed_at: new Date().toISOString()
            }
        }
    } else if (result.document_type === 'BANK_STATEMENT' && result.statement_data) {
        inferredType = 'Bank Statement'
        const statement = result.statement_data
        
        if (!statement.transactions || statement.transactions.length === 0) {
            validationErrors.push('No transactions found in statement')
        }

        finalData = {
            ...statement,
            validation: {
                confidence: result.confidence,
                errors: validationErrors,
                requires_verification: isLowConfidence || validationErrors.length > 0,
                processed_at: new Date().toISOString()
            }
        }
    }

    // 4. Update Database
    const { error: updateError } = await supabase.from('documents').update({
        extracted_data: finalData,
        inferred_type: inferredType,
        processing_status: 'success',
        extraction_source: 'ai',
        processing_error: null,
        ocr_telemetry: result.ocr_telemetry,
    }).eq('id', document_id)

    if (updateError) {
        log('update-failed', updateError)
        throw updateError
    }

    await auditLog(supabase, doc.user_id, 'document.parse', 'completed', { document_id, type: inferredType })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('[document-processed-webhook] unhandled error', err)
    if (SENTRY_DSN) Sentry.captureException(err)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

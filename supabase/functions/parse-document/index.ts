import { createClient } from "@supabase/supabase-js"
import * as Sentry from "npm:@sentry/deno"
import { inspectFile, validateMagicBytes, extractPdfText } from "../_shared/document-parser/src/mod.ts"
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
    // Extract text for duration cascade and other soft-validation rules
    const textResult = await extractPdfText(buffer)
    const rawTextCache = textResult.ok ? textResult.value : ''

    const unifiedResult = await callPythonBackend(buffer, contentType, password)
    log('python-processing-success', { type: unifiedResult.document_type, confidence: unifiedResult.confidence })

    if (unifiedResult.document_type === 'LOAN' && (unifiedResult.loan_data || unifiedResult.multi_loan_data)) {
        await handleLoanExtraction(supabase, documentId, unifiedResult, rawTextCache)
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

const REPAYMENT_PLAN_TERMS: Record<string, number> = {
  'standard repayment': 120,    // federal: 10yr
  'extended repayment': 300,    // federal: 25yr
  'graduated repayment': 120,   // federal: 10yr
};

const ALLOWED_CURRENCIES = new Set(['USD', 'PHP', 'SGD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'HKD', 'MYR']);

const CURRENCY_PATTERNS: Array<[RegExp, string]> = [
  [/\$[\d,]/,  'USD'],   // $ followed by digit — check before ₱ to avoid false S$ match
  [/USD/i,     'USD'],
  [/₱[\d,]/,  'PHP'],
  [/PHP/i,     'PHP'],
  [/S\$[\d,]/, 'SGD'],
  [/SGD/i,     'SGD'],
  [/€[\d,]/,   'EUR'],
  [/EUR/i,     'EUR'],
  [/£[\d,]/,   'GBP'],
  [/GBP/i,     'GBP'],
];

function inferCurrency(
  extracted: string | null | undefined,
  rawText: string,
  fallback: string = 'USD'
): string {
  // Trust extracted value if valid
  if (extracted && ALLOWED_CURRENCIES.has(extracted.toUpperCase())) {
    return extracted.toUpperCase();
  }
  // Scan raw text for currency signals
  for (const [pattern, code] of CURRENCY_PATTERNS) {
    if (pattern.test(rawText)) return code;
  }
  return fallback;
}

/**
 * Attempts to infer the loan duration in months based on repayment plan names
 * mentioned in the document text if the explicit numeric term is missing.
 * 
 * @param duration - The duration already extracted (if any).
 * @param rawText - The raw text of the document.
 * @returns The inferred or original duration in months.
 */
function inferDurationMonths(
  duration: number | null | undefined,
  rawText: string
): number | null {
  if (duration && duration > 0) return duration;
  const lower = rawText.toLowerCase();
  for (const [plan, months] of Object.entries(REPAYMENT_PLAN_TERMS)) {
    if (lower.includes(plan)) return months;
  }
  return null;
}

/**
 * Extracts Annual EIR from raw document text if explicitly present.
 * Returns null if not found.
 */
function extractAnnualEIR(rawText: string): number | null {
  const match = rawText.match(/Annual\s+EIR[:\s]+([0-9]+\.?[0-9]*)\s*%/i);
  if (match?.[1]) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

const ADD_ON_TEXT_SIGNALS = [
  /Monthly\s+EIR/i,
  /Annual\s+EIR/i,
  /EFFECTIVE\s+INTEREST/i,
  /flat\s+rate/i,
  /add[\s-]on\s+interest/i,
  /Monthly\s+Amort(?:ization)?:/i,
];

/**
 * Detects Add-on Interest loan type from document text signals.
 */
function inferInterestTypeFromText(rawText: string): 'Add-on Interest' | null {
  const signalCount = ADD_ON_TEXT_SIGNALS.filter(re => re.test(rawText)).length;
  return signalCount >= 2 ? 'Add-on Interest' : null;
}

/**
 * Resolves the correct annual rate from an extracted rate that may be monthly.
 * Uses payment math cross-check: tries rate as-is vs rate × 12 against installment_amount.
 *
 * Priority:
 *  1. If rate already looks annual (>= 3%), trust it
 *  2. If rawText has Annual EIR → use as verification only (not stored as interest_rate)
 *  3. If rate < 3.0 AND add-on text signals present → treat as monthly, multiply by 12
 *  4. If rate < 3.0 AND installment_amount present → math cross-check
 *  5. Otherwise → return rate unchanged
 */
function resolveAnnualRate(
  extractedRate: number,
  installmentAmount: number | null,
  principal: number,
  durationMonths: number,
  rawText: string
): { annualRate: number; wasConverted: boolean; suggestedType: 'Add-on Interest' | null } {
  // If rate already looks annual (>= 3%), trust it
  if (extractedRate >= 3.0) {
    return { annualRate: extractedRate, wasConverted: false, suggestedType: null };
  }

  const hasAddOnSignals = ADD_ON_TEXT_SIGNALS.filter(re => re.test(rawText)).length >= 1;
  const annualizedRate = extractedRate * 12;

  // Check if rate × 12 as add-on matches the installment_amount
  if (installmentAmount && installmentAmount > 0 && principal > 0 && durationMonths > 0) {
    const addOnPayment = (principal * (1 + (annualizedRate / 100) * (durationMonths / 12))) / durationMonths;
    const diff = Math.abs(addOnPayment - installmentAmount) / installmentAmount;

    if (diff < 0.02) {
      // Rate × 12 as add-on matches actual payment within 2% — high confidence conversion
      return {
        annualRate: annualizedRate,
        wasConverted: true,
        suggestedType: 'Add-on Interest',
      };
    }
  }

  // No installment_amount to cross-check, but text signals present — convert with lower confidence
  if (hasAddOnSignals) {
    return {
      annualRate: annualizedRate,
      wasConverted: true,
      suggestedType: 'Add-on Interest',
    };
  }

  // Rate < 3% but no signals — flag as suspicious but don't convert
  return { annualRate: extractedRate, wasConverted: false, suggestedType: null };
}

/**
 * Validates and formats extracted loan data before storing it.
 * Supports both single-loan and multi-loan document structures.
 * 
 * @param supabase - Supabase client instance.
 * @param documentId - UUID of the document record.
 * @param result - Raw result from the AI service.
 * @param rawText - Raw text of the document for secondary inference.
 */
async function handleLoanExtraction(
  supabase: SupabaseClient, 
  documentId: string, 
  result: UnifiedDocumentResult,
  rawText: string
): Promise<void> {
  const structure = result.loan_structure;

  // Guard 1: declared structure must match populated field
  if (structure === 'single' && !result.loan_data) {
    await storeFailed(supabase, documentId, { 
      stage: 'validate',
      code: 'SCHEMA_MISMATCH', 
      message: 'single declared but loan_data missing', 
      retryable: true 
    });
    return;
  }
  if (structure === 'multi' && !result.multi_loan_data) {
    await storeFailed(supabase, documentId, { 
      stage: 'validate',
      code: 'SCHEMA_MISMATCH', 
      message: 'multi declared but multi_loan_data missing', 
      retryable: true 
    });
    return;
  }

  // Normalize to array regardless of structure
  const rawLoans = structure === 'multi'
    ? result.multi_loan_data!.loans
    : [result.loan_data!];

  // Guard 2: empty array
  if (rawLoans.length === 0) {
    await storeFailed(supabase, documentId, { 
      stage: 'validate',
      code: 'NO_LOANS_FOUND', 
      message: 'No loans found in document', 
      retryable: true 
    });
    return;
  }

  // Guard 3: multi declared but only 1 loan — demote to single, log warning
  const effectiveStructure = (structure === 'multi' && rawLoans.length === 1) ? 'single' : structure;

  // Before resolvedLoans mapping — extract account-level fallback
  const accountMonthly = structure === 'multi'
    ? (result.multi_loan_data?.account_monthly_payment ?? null)
    : null;

  // Apply duration cascade + installment fallback + currency inference per loan
  const resolvedLoans = rawLoans.map((loan, i) => {
    const prefix = rawLoans.length > 1 ? `Loan ${i + 1}: ` : '';

    // Currency
    const resolvedCurrency = inferCurrency(loan.currency, rawText);

    // Interest rate + type resolution
    const { annualRate, wasConverted, suggestedType } = resolveAnnualRate(
      loan.interest_rate,
      loan.installment_amount ?? accountMonthly,
      loan.principal,
      loan.duration_months ?? 0,
      rawText
    );

    const resolvedInterestType = suggestedType
      ?? inferInterestTypeFromText(rawText)
      ?? loan.interest_type
      ?? 'Standard Amortized';

    // Annual EIR extraction
    const annualEir = extractAnnualEIR(rawText) ?? loan.annual_eir ?? null;

    if (wasConverted) {
      console.log(`[parse-document] [${documentId}] ${prefix}interest_rate converted: ${loan.interest_rate}% (monthly) → ${annualRate}% (annual)`);
    }

    return {
      ...loan,
      duration_months: inferDurationMonths(loan.duration_months, rawText),
      installment_amount: loan.installment_amount ?? accountMonthly,
      currency: resolvedCurrency,
      interest_rate: annualRate,
      interest_type: resolvedInterestType,
      annual_eir: annualEir,
    };
  });

  // Validate per loan
  const validationErrors: string[] = [];
  resolvedLoans.forEach((loan, i) => {
    const prefix = rawLoans.length > 1 ? `Loan ${i + 1}: ` : '';
    if (loan.principal <= 0) validationErrors.push(`${prefix}Principal must be > 0`);
    if (loan.interest_rate < 0 || loan.interest_rate > 100) validationErrors.push(`${prefix}Interest rate out of range`);
    if (!loan.duration_months) validationErrors.push(`${prefix}Duration not found — enter manually`);
    if (!loan.name) validationErrors.push(`${prefix}Loan name missing`);
    
    // Lender warning
    if (!loan.lender) validationErrors.push(`${prefix}Lender not found — enter manually`);

    if (!ALLOWED_CURRENCIES.has(loan.currency)) {
      validationErrors.push(`${prefix}Unrecognised currency "${loan.currency}" — verify manually`);
    }

    // Suspicious rate even after resolution (< 3% annual is almost never correct)
    if (loan.interest_rate > 0 && loan.interest_rate < 3.0) {
      validationErrors.push(`${prefix}Interest rate ${loan.interest_rate}% may be a monthly rate — verify`);
    }
  });

  // Cross-loan currency consistency (multi-loan only)
  if (rawLoans.length > 1) {
    const currencies = new Set(resolvedLoans.map(l => l.currency));
    if (currencies.size > 1) {
      validationErrors.push(`Mixed currencies across loans: ${[...currencies].join(', ')} — verify each loan`);
    }
  }

  const formattedData: MultiLoanExtractedData = {
    loans: resolvedLoans.map(loan => ({
      name: loan.name,
      principal: loan.principal,
      currency: loan.currency || 'USD',
      interest_rate: loan.interest_rate,
      duration_months: loan.duration_months ?? 0,
      installment_amount: loan.installment_amount,
      lender: loan.lender,
      start_date: loan.start_date || null,
      interest_type: loan.interest_type || 'Standard Amortized',
      interest_basis: null,
      inferred_type: loan.interest_type || 'Loan',
      annual_eir: loan.annual_eir ?? null,
    })),
    loan_structure: effectiveStructure,  // pass through for UI branching
  };

  await storeSuccess(supabase, documentId, {
    ...formattedData,
    validation: {
      confidence: result.confidence,
      errors: validationErrors,
      requires_verification: (result.confidence ?? 0) < 0.6 || validationErrors.length > 0,
      processed_at: new Date().toISOString(),
    },
  }, 'Loan', result.ocr_telemetry);
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

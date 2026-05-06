export type PipelineStage = 'inspect' | 'extract' | 'parse' | 'ocr' | 'ai' | 'validate'

export interface ProcessingError {
  stage: PipelineStage
  code: string
  message: string
  retryable: boolean
  metadata?: Record<string, unknown>
}

export type StageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ProcessingError }

export interface ExtractedLoanData {
  name: string | null
  principal: number | null
  currency: string | null
  interest_rate: number | null
  duration_months: number | null
  installment_amount: number | null
  lender: string | null
  start_date: string | null
  interest_type: string | null
  interest_basis: string | null
  inferred_type: string | null
}

export interface ParseResult {
  data: ExtractedLoanData
  confidence: number
  source: 'pdfjs' | 'vision' | 'ai' | 'manual'
}

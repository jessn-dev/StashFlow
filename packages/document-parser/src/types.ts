import type { LoanExtractionSchema } from './generated_loan_schema.ts'
import type { TransactionCategorizationSchema } from './generated_transaction_schema.ts'
import type { AnomalyReportSchema } from './generated_anomaly_schema.ts'
import type { UnifiedDocumentResponse } from './generated_unified_schema.ts'

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

/**
 * Extends the AI-extracted schema with additional metadata inferred by the core engine.
 */
export interface ExtractedLoanData extends LoanExtractionSchema {
  interest_basis: string | null
  inferred_type: string | null
}

export interface MultiLoanExtractedData {
  loans: ExtractedLoanData[]
}

/**
 * AI-driven transaction categorization result.
 */
export interface TransactionCategorization extends TransactionCategorizationSchema {}

/**
 * AI-driven budget anomaly report.
 */
export interface AnomalyReport extends AnomalyReportSchema {}

/**
 * Unified AI-driven document processing result.
 */
export interface UnifiedDocumentResult extends UnifiedDocumentResponse {}

export interface ParseResult {
  data: ExtractedLoanData
  confidence: number
  source: 'pdfjs' | 'vision' | 'ai' | 'manual'
}

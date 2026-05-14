export { inspectFile, validateMagicBytes } from './inspect.ts'
export { extractPdfText } from './extract/pdf.ts'
export { runVisionOCR } from './extract/vision.ts'
export { parseLoan } from './parse/loan.ts'
export { scoreResult } from './score.ts'
export type {
  ExtractedLoanData,
  MultiLoanExtractedData,
  ParseResult,
  ProcessingError,
  PipelineStage,
  StageResult,
  UnifiedDocumentResult,
} from './types.ts'

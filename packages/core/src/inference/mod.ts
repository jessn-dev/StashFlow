/**
 * Financial Inference Module.
 * 
 * Provides tools for deducing underlying financial structures from observed data patterns,
 * such as identifying loan interest calculation methods and calculating effective interest rates.
 */

export { inferLoanStructure, computeAddOnEIR } from './loanStructure.ts';
export type { LoanInferenceInput, LoanInferenceResult, LoanInferenceAlternative } from './loanStructure.ts';

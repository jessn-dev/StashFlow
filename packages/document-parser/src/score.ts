import type { ExtractedLoanData } from './types.ts'

const WEIGHTS: Partial<Record<keyof ExtractedLoanData, number>> = {
  principal:          0.25,
  interest_rate:      0.20,
  duration_months:    0.15,
  installment_amount: 0.10,
  currency:           0.10,
  start_date:         0.08,
  name:               0.05,
  lender:             0.04,
  interest_type:      0.02,
  interest_basis:     0.01,
}

export function scoreResult(data: ExtractedLoanData): number {
  return Object.entries(WEIGHTS).reduce((sum, [key, weight]) => {
    const val = data[key as keyof ExtractedLoanData]
    return sum + (val != null ? (weight ?? 0) : 0)
  }, 0)
}

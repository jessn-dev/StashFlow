import { DTIRatioResult } from '../types'

/**
 * Calculates Debt-to-Income (DTI) ratio and returns risk assessment.
 * DTI = (Total Monthly Debt Payments / Gross Monthly Income) * 100
 *
 * Risk levels:
 * - Low:    <= 36%  (Healthy)
 * - Medium: 37–49%  (Manageable but cautious)
 * - High:   >= 50%  (High risk)
 *
 * Edge cases:
 * - No income AND no debt  → ratio 0, status 'low'   (new user, not high-risk)
 * - No income BUT has debt → ratio 100, status 'high' (genuine risk)
 */
export function calculateDTIRatio(
  monthlyIncome: number,
  monthlyDebt: number,
  currency: string = 'USD'
): DTIRatioResult {
  // New users or users with no financial data should not be flagged as high-risk.
  if (monthlyIncome <= 0) {
    if (monthlyDebt <= 0) {
      return { ratio: 0, status: 'low', color: '#1A7A7A' }
    }
    // Debt with no income is genuine high risk.
    return { ratio: 100, status: 'high', color: '#D4522A' }
  }

  const ratio = (monthlyDebt / monthlyIncome) * 100

  // Regional Thresholds from dti-reference.docx
  let healthyLimit = 36
  let maxLimit = 49

  if (currency === 'PHP') {
    healthyLimit = 30
    maxLimit = 40
  } else if (currency === 'SGD') {
    healthyLimit = 45
    maxLimit = 55
  } else if (currency === 'JPY') {
    healthyLimit = 30
    maxLimit = 45
  }

  if (ratio <= healthyLimit) {
    return { ratio, status: 'low', color: '#1A7A7A' }
  } else if (ratio <= maxLimit) {
    return { ratio, status: 'medium', color: '#EAB308' }
  } else {
    return { ratio, status: 'high', color: '#D4522A' }
  }
}

export interface DTISimulationPayload {
  monthlyIncome: number
  monthlyDebt: number
  currency?: string
  addLoanMonthly?: number
  addIncomeMonthly?: number
  payOffLoanMonthly?: number
}

/**
 * Projects DTI ratio based on potential financial changes.
 */
export function simulateDTI(payload: DTISimulationPayload) {
  const currency = payload.currency || 'USD'
  const current = calculateDTIRatio(payload.monthlyIncome, payload.monthlyDebt, currency)
  
  const projectedIncome = payload.monthlyIncome + (payload.addIncomeMonthly ?? 0)
  const projectedDebt = payload.monthlyDebt + (payload.addLoanMonthly ?? 0) - (payload.payOffLoanMonthly ?? 0)
  
  const projected = calculateDTIRatio(projectedIncome, Math.max(0, projectedDebt), currency)
  
  return {
    current: current.ratio,
    projected: projected.ratio,
    // Difference in percentage points
    diffPpt: projected.ratio - current.ratio,
    newStatus: projected.status,
    newColor: projected.color
  }
}

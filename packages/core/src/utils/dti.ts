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
  monthlyDebt: number
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

  if (ratio <= 36) {
    return { ratio, status: 'low', color: '#1A7A7A' }    // Brand accent/safe color
  } else if (ratio < 50) {
    return { ratio, status: 'medium', color: '#EAB308' } // Warning yellow
  } else {
    return { ratio, status: 'high', color: '#D4522A' }   // Brand high-risk color
  }
}

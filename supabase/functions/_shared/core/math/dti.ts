import { DTIRatioResult } from '../schema'
import { getRegionalStrategy } from '../regional'

/**
 * Calculates Debt-to-Income (DTI) ratio and returns risk assessment using Regional Strategy.
 */
export function calculateDTIRatio(
  monthlyIncome: number,
  monthlyDebt: number,
  currency: string = 'USD'
): DTIRatioResult {
  const strategy = getRegionalStrategy(currency)
  const { healthy, max } = strategy.getDTIThresholds()

  // Handle negative or zero income (avoid infinity)
  if (monthlyIncome <= 0) {
    return {
      ratio: monthlyDebt > 0 ? 100 : 0,
      status: monthlyDebt > 0 ? 'high' : 'low',
      color: monthlyDebt > 0 ? '#D4522A' : '#1A7A7A'
    }
  }

  const ratio = (monthlyDebt / monthlyIncome) * 100
  
  let status: 'low' | 'medium' | 'high' = 'low'
  let color = '#1A7A7A'

  if (ratio <= healthy) {
    status = 'low'
    color = '#1A7A7A'
  } else if (ratio <= max) {
    status = 'medium'
    color = '#EAB308'
  } else {
    status = 'high'
    color = '#D4522A'
  }

  return {
    ratio: Number(ratio.toFixed(2)),
    status,
    color
  }
}

/**
 * Simulates how paying off or adding a loan affects DTI.
 */
export interface DTISimulationOptions {
  monthlyIncome: number
  monthlyDebt: number
  payOffLoanMonthly?: number
  newLoanMonthly?: number
  currency?: string
}

export function simulateDTI(options: DTISimulationOptions) {
  const { monthlyIncome, monthlyDebt, payOffLoanMonthly = 0, newLoanMonthly = 0, currency = 'USD' } = options
  
  const current = calculateDTIRatio(monthlyIncome, monthlyDebt, currency)
  
  const projectedDebt = Math.max(0, monthlyDebt - payOffLoanMonthly + newLoanMonthly)
  const projected = calculateDTIRatio(monthlyIncome, projectedDebt, currency)
  
  return {
    current: current.ratio,
    projected: projected.ratio,
    diffPpt: Number((projected.ratio - current.ratio).toFixed(2)),
    newStatus: projected.status,
    newColor: projected.color
  }
}

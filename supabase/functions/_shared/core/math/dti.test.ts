import { describe, it, expect } from 'vitest'
import { calculateDTIRatio, simulateDTI } from './dti'

describe('calculateDTIRatio', () => {
  it('should return low risk for healthy US DTI (<= 36%)', () => {
    const result = calculateDTIRatio(10000, 2000, 'USD')
    expect(result.ratio).toBe(20)
    expect(result.status).toBe('low')
  })

  it('should return medium risk for PH DTI at 35% (max 40%)', () => {
    const result = calculateDTIRatio(10000, 3500, 'PHP')
    expect(result.ratio).toBe(35)
    expect(result.status).toBe('medium')
  })

  it('should handle zero income as high risk', () => {
    const result = calculateDTIRatio(0, 500)
    expect(result.status).toBe('high')
  })
})

describe('simulateDTI', () => {
  it('should project lower DTI after payoff', () => {
    const result = simulateDTI({
      monthlyIncome: 10000,
      monthlyDebt: 2000,
      payOffLoanMonthly: 1000
    })
    expect(result.projected).toBe(10)
    expect(result.newStatus).toBe('low')
  })
})

import { describe, it, expect } from 'vitest'
import { calculateDTIRatio, simulateDTI } from './dti'

describe('calculateDTIRatio', () => {
  it('should return low risk for healthy DTI (<= 36%)', () => {
    const result = calculateDTIRatio(10000, 3000)
    expect(result.ratio).toBe(30)
    expect(result.status).toBe('low')
    expect(result.color).toBe('#1A7A7A')
  })

  it('should return medium risk for DTI between 37% and 49%', () => {
    const result = calculateDTIRatio(10000, 4500)
    expect(result.ratio).toBe(45)
    expect(result.status).toBe('medium')
    expect(result.color).toBe('#EAB308')
  })

  it('should return high risk for DTI >= 50%', () => {
    const result = calculateDTIRatio(10000, 5000)
    expect(result.ratio).toBe(50)
    expect(result.status).toBe('high')
    expect(result.color).toBe('#D4522A')
  })

  it('should handle zero income and zero debt as low risk', () => {
    const result = calculateDTIRatio(0, 0)
    expect(result.ratio).toBe(0)
    expect(result.status).toBe('low')
  })

  it('should handle zero income with debt as high risk (100%)', () => {
    const result = calculateDTIRatio(0, 500)
    expect(result.ratio).toBe(100)
    expect(result.status).toBe('high')
  })

  it('should handle debt exceeding income as high risk', () => {
    const result = calculateDTIRatio(2000, 3000)
    expect(result.ratio).toBe(150)
    expect(result.status).toBe('high')
  })
})

describe('calculateDTIRatio — regional thresholds', () => {
  it('PHP: 35% is medium (healthyLimit=30, max=40)', () => {
    const result = calculateDTIRatio(10000, 3500, 'PHP')
    expect(result.status).toBe('medium')
  })

  it('PHP: 45% is high (> max 40%)', () => {
    const result = calculateDTIRatio(10000, 4500, 'PHP')
    expect(result.status).toBe('high')
  })

  it('SGD: 50% is medium (healthyLimit=45, max=55)', () => {
    const result = calculateDTIRatio(10000, 5000, 'SGD')
    expect(result.status).toBe('medium')
  })

  it('SGD: 60% is high (> max 55%)', () => {
    const result = calculateDTIRatio(10000, 6000, 'SGD')
    expect(result.status).toBe('high')
  })

  it('JPY: 35% is medium (healthyLimit=30, max=45)', () => {
    const result = calculateDTIRatio(10000, 3500, 'JPY')
    expect(result.status).toBe('medium')
  })

  it('JPY: 50% is high (> max 45%)', () => {
    const result = calculateDTIRatio(10000, 5000, 'JPY')
    expect(result.status).toBe('high')
  })
})

describe('simulateDTI', () => {
  it('projects higher DTI when adding a loan', () => {
    const result = simulateDTI({ monthlyIncome: 10000, monthlyDebt: 2000, addLoanMonthly: 1000 })
    expect(result.current).toBe(20)
    expect(result.projected).toBe(30)
    expect(result.diffPpt).toBe(10)
    expect(result.newStatus).toBe('low')
  })

  it('projects lower DTI when paying off debt', () => {
    const result = simulateDTI({ monthlyIncome: 10000, monthlyDebt: 4000, payOffLoanMonthly: 2000 })
    expect(result.projected).toBe(20)
    expect(result.diffPpt).toBe(-20)
    expect(result.newStatus).toBe('low')
  })

  it('clamps projected debt to zero when payoff exceeds debt', () => {
    const result = simulateDTI({ monthlyIncome: 10000, monthlyDebt: 1000, payOffLoanMonthly: 5000 })
    expect(result.projected).toBe(0)
    expect(result.newStatus).toBe('low')
  })
})

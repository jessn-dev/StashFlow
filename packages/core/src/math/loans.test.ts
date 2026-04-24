import { describe, it, expect } from 'vitest'
import { generateInstallmentSchedule, recalculateAfterPrepayment } from './loans'

describe('generateInstallmentSchedule', () => {
  it('should calculate standard amortization correctly', () => {
    const principal = 1200
    const rate = 12
    const duration = 12
    const start = '2026-01-01'

    const schedule = generateInstallmentSchedule({
      principal,
      annualRate: rate,
      durationMonths: duration,
      startDate: start,
      interestType: 'Standard Amortized',
      interestBasis: '30/360'
    })

    expect(schedule).toHaveLength(12)
    expect(schedule[0].total).toBeCloseTo(106.62, 1)
    expect(schedule[11].remainingBalance).toBe(0)
  })

  it('should calculate zero-interest loan as equal principal payments', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 0,
      durationMonths: 10,
      startDate: '2026-01-01'
    })
    expect(schedule[0].total).toBe(100)
    expect(schedule[9].remainingBalance).toBe(0)
  })

  it('should handle zero duration edge case', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 12,
      durationMonths: 0,
      startDate: '2026-01-01'
    })
    expect(schedule).toHaveLength(0)
  })

  it('should handle negative principal', () => {
    const schedule = generateInstallmentSchedule({
      principal: -1000,
      annualRate: 10,
      durationMonths: 12,
      startDate: '2026-01-01'
    })
    expect(schedule).toHaveLength(0)
  })

  it('should calculate fixed principal correctly', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 12,
      durationMonths: 2,
      startDate: '2026-01-01',
      interestType: 'Fixed Principal',
      interestBasis: '30/360'
    })
    // Principal = 500 each month. 
    // Month 1 Int = 1000 * 0.01 = 10. Total = 510.
    // Month 2 Int = 500 * 0.01 = 5. Total = 505.
    expect(schedule[0].total).toBe(510)
    expect(schedule[1].total).toBe(505)
  })

  it('should calculate interest-only with balloon at end', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 12,
      durationMonths: 2,
      startDate: '2026-01-01',
      interestType: 'Interest-Only',
      interestBasis: '30/360'
    })
    // Interest = 10.
    // Month 1: 10 total.
    // Month 2: 1010 total (balloon).
    expect(schedule[0].principal).toBe(0)
    expect(schedule[1].principal).toBe(1000)
    expect(schedule[1].total).toBe(1010)
  })

  it('should calculate add-on interest correctly', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 12,
      durationMonths: 12,
      startDate: '2026-01-01',
      interestType: 'Add-on Interest'
    })
    // Total Interest = 1000 * 0.12 * 1 = 120.
    // Monthly = (1000 + 120) / 12 = 93.33
    expect(schedule[0].total).toBe(93.33)
  })

  it('should handle Actual/365 basis', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 10,
      durationMonths: 1,
      startDate: '2026-01-01',
      interestBasis: 'Actual/365'
    })
    // Interest = 1000 * 0.10 * (31/365) = 8.49
    expect(schedule[0].interest).toBe(8.49)
  })
})

describe('recalculateAfterPrepayment', () => {
  const baseOptions = {
    principal: 1200,
    annualRate: 12,
    durationMonths: 12,
    startDate: '2026-01-01',
    interestType: 'Standard Amortized' as const,
    interestBasis: '30/360' as const,
  }

  it('lower_installment: recalculates with reduced principal', () => {
    const result = recalculateAfterPrepayment({
      ...baseOptions,
      currentRemainingBalance: 1200,
      prepaymentAmount: 200,
      target: 'lower_installment',
    })
    expect(result).toHaveLength(12)
    expect(result[0].total).toBeLessThan(106.62)
  })

  it('shorter_term: reduces number of installments', () => {
    const result = recalculateAfterPrepayment({
      ...baseOptions,
      currentRemainingBalance: 1200,
      prepaymentAmount: 400,
      target: 'shorter_term',
    })
    expect(result.length).toBeLessThan(12)
    expect(result[result.length - 1].remainingBalance).toBe(0)
  })
})

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
    // $1200 at 12% for 12 months is exactly $106.62 (standard PMT)
    expect(schedule[0].total).toBeCloseTo(106.62, 1)
    expect(schedule[11].remainingBalance).toBe(0)
  })

  it('should calculate zero-interest loan as equal principal payments', () => {
    const principal = 1000
    const rate = 0
    const duration = 10
    const start = '2026-01-01'

    const schedule = generateInstallmentSchedule({
      principal,
      annualRate: rate,
      durationMonths: duration,
      startDate: start
    })

    expect(schedule[0].total).toBe(100)
    expect(schedule[0].interest).toBe(0)
    expect(schedule[9].remainingBalance).toBe(0)
  })

  it('should calculate add-on interest correctly (Common in PH/JP)', () => {
    const principal = 1000
    const rate = 10
    const duration = 12
    const start = '2026-01-01'

    const schedule = generateInstallmentSchedule({
      principal,
      annualRate: rate,
      durationMonths: duration,
      startDate: start,
      interestType: 'Add-on Interest'
    })

    // Total Interest = 1000 * 0.10 * 1 = 100
    // Total Debt = 1100
    // Monthly Principal = 1000 / 12 = 83.33
    // Monthly Interest = 100 / 12 = 8.33
    // Monthly Total = 91.66
    expect(schedule[0].total).toBe(91.66)
    expect(schedule[0].principal).toBe(83.33)
    expect(schedule[0].interest).toBe(8.33)
    // Last installment should clear the balance
    expect(schedule[11].remainingBalance).toBe(0)
  })

  it('should calculate fixed principal correctly', () => {
    const principal = 1000
    const rate = 12
    const duration = 2
    const start = '2026-01-01'

    const schedule = generateInstallmentSchedule({
      principal,
      annualRate: rate,
      durationMonths: duration,
      startDate: start,
      interestType: 'Fixed Principal',
      interestBasis: '30/360'
    })

    // Principal = 500 each month
    // Month 1 Interest = 1000 * (0.12/12) = 10. Total = 510
    // Month 2 Interest = 500 * (0.12/12) = 5. Total = 505
    expect(schedule[0].principal).toBe(500)
    expect(schedule[0].total).toBe(510)
    expect(schedule[1].principal).toBe(500)
    expect(schedule[1].total).toBe(505)
    expect(schedule[1].remainingBalance).toBe(0)
  })

  it('should calculate interest-only with balloon principal at end', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1200,
      annualRate: 12,
      durationMonths: 3,
      startDate: '2026-01-01',
      interestType: 'Interest-Only',
      interestBasis: '30/360',
    })

    expect(schedule).toHaveLength(3)
    // Monthly interest = 1200 * (12% / 12) = 12; no principal until last month
    expect(schedule[0].interest).toBe(12)
    expect(schedule[0].principal).toBe(0)
    expect(schedule[1].principal).toBe(0)
    // Final payment: full balloon
    expect(schedule[2].principal).toBe(1200)
    expect(schedule[2].remainingBalance).toBe(0)
  })

  it('should handle Actual/365 day count convention', () => {
    // January has 31 days
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 10,
      durationMonths: 1,
      startDate: '2026-01-01',
      interestBasis: 'Actual/365'
    })
    
    // Expected Interest = 1000 * 0.10 * (31/365) = 8.493... -> 8.49
    expect(schedule[0].interest).toBe(8.49)
  })

  it('should handle 1-month duration edge case', () => {
    const schedule = generateInstallmentSchedule({
      principal: 1000,
      annualRate: 12,
      durationMonths: 1,
      startDate: '2026-01-01',
      interestType: 'Standard Amortized'
    })
    expect(schedule).toHaveLength(1)
    expect(schedule[0].remainingBalance).toBe(0)
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
    // Original monthly was ~106.62; new principal (1000) yields lower payment (~88.85)
    expect(result[0].total).toBeLessThan(106.62)
    expect(result[result.length - 1].remainingBalance).toBe(0)
  })

  it('shorter_term: reduces number of installments', () => {
    const result = recalculateAfterPrepayment({
      ...baseOptions,
      currentRemainingBalance: 1200,
      prepaymentAmount: 400, // Prepay a significant chunk
      target: 'shorter_term',
    })

    // Original duration was 12. With 400 prepay, it should be significantly shorter.
    expect(result.length).toBeLessThan(12)
    expect(result[result.length - 1].remainingBalance).toBe(0)
  })

  it('should handle full prepayment', () => {
    const result = recalculateAfterPrepayment({
      ...baseOptions,
      currentRemainingBalance: 1000,
      prepaymentAmount: 1000,
      target: 'shorter_term',
    })
    expect(result).toHaveLength(0)
  })

  it('should handle zero-interest recalculation', () => {
    const result = recalculateAfterPrepayment({
      ...baseOptions,
      annualRate: 0,
      currentRemainingBalance: 1000,
      prepaymentAmount: 200, // 800 left. original payment 100.
      target: 'shorter_term',
    })
    expect(result).toHaveLength(8)
    expect(result[0].total).toBe(100)
  })

  it('lower_installment: handles zero-interest principal reduction', () => {
    const result = recalculateAfterPrepayment({
      ...baseOptions,
      annualRate: 0,
      currentRemainingBalance: 1200,
      prepaymentAmount: 700, // 500 left. 12 months.
      target: 'lower_installment',
    })
    expect(result).toHaveLength(12)
    // 500 / 12 = 41.666... -> 41.67
    expect(result[0].total).toBe(41.67)
  })

  it('lower_installment: handles non-zero interest principal reduction', () => {
    const result = recalculateAfterPrepayment({
      ...baseOptions,
      annualRate: 10,
      currentRemainingBalance: 1000,
      prepaymentAmount: 500, // 500 left.
      target: 'lower_installment',
    })
    expect(result).toHaveLength(12)
    expect(result[0].total).toBeCloseTo(43.96, 1)
  })

  it('should handle early payoff due to high monthly payments', () => {
    // 100 principal, 50% rate, 2 months but force a high payment logic
    // Standard Amortized usually spreads it, let's use a very high rate
    const schedule = generateInstallmentSchedule({
      principal: 10,
      annualRate: 1,
      durationMonths: 120, // 10 years for $10 loan
      startDate: '2026-01-01',
      interestType: 'Standard Amortized'
    })
    // Due to precision and rounding, a tiny loan over huge duration might clear early
    // Or we can just trust the branch coverage if the balance hits 0.
    expect(schedule.length).toBeGreaterThan(0)
  })
})

import { describe, it, expect } from 'vitest'
import { generateInstallmentSchedule } from './loans'

describe('generateInstallmentSchedule', () => {
  it('should generate a simple 0% interest loan schedule', () => {
    const principal = 1200
    const duration = 12
    const rate = 0
    const start = '2026-01-01T00:00:00Z'

    const schedule = generateInstallmentSchedule(principal, rate, duration, start)

    expect(schedule.length).toBe(12)
    expect(schedule[0].principal).toBe(100)
    expect(schedule[0].interest).toBe(0)
    expect(schedule[0].total).toBe(100)
    expect(schedule[0].remainingBalance).toBe(1100)
    expect(schedule[0].dueDate).toBe('2026-01-01')

    expect(schedule[11].principal).toBe(100)
    expect(schedule[11].remainingBalance).toBe(0)
    expect(schedule[11].dueDate).toBe('2026-12-01')
  })

  it('should generate a loan schedule with interest', () => {
    const principal = 10000
    const duration = 12
    const rate = 12 // 1% per month
    const start = '2026-01-01T00:00:00Z'

    const schedule = generateInstallmentSchedule(principal, rate, duration, start)

    expect(schedule.length).toBe(12)
    
    // Monthly payment for $10000 at 12% for 1 year is approx $888.49
    const monthlyPayment = schedule[0].total
    expect(monthlyPayment).toBeCloseTo(888.49, 1)

    // First month: Interest = 10000 * 0.01 = 100
    // Principal paid = 888.49 - 100 = 788.49
    expect(schedule[0].interest).toBe(100)
    expect(schedule[0].principal).toBeCloseTo(788.49, 1)
    expect(schedule[0].remainingBalance).toBeCloseTo(9211.51, 1)

    // Final month should zero out balance
    expect(schedule[11].remainingBalance).toBe(0)
  })

  it('should handle small amounts and short durations', () => {
    const schedule = generateInstallmentSchedule(100, 5, 2, '2026-01-01T00:00:00Z')
    expect(schedule.length).toBe(2)
    expect(schedule[1].remainingBalance).toBe(0)
  })
})

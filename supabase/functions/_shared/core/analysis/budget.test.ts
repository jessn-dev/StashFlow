import { describe, it, expect } from 'vitest'
import { generateSmartBudget } from './budget'

describe('generateSmartBudget', () => {
  const monthlyIncome = 5000
  const monthlyDebt = 1000
  const essentialAverages = { housing: 1500, food: 500, utilities: 300 }

  it('generates a standard budget for healthy DTI', () => {
    const rec = generateSmartBudget(
      monthlyIncome,
      monthlyDebt,
      'low',
      essentialAverages,
      undefined,
      'USD'
    )
    expect(rec.allocations.housing).toBe(1500)
    expect(rec.totalBudgeted).toBeGreaterThan(0)
    // 5000 - 1000 (debt) - 2300 (essentials) = 1700
    expect(rec.disposableIncome).toBe(1700) 
  })

  it('restricts discretionary spending for high DTI', () => {
    const rec = generateSmartBudget(
      monthlyIncome,
      3000, // Very high debt
      'high',
      essentialAverages,
      undefined,
      'USD'
    )
    const highRiskAlert = rec.alerts.find(a => a.message.includes('High Risk Debt-to-Income'))
    expect(highRiskAlert).toBeDefined()
  })

  it('adjusts for cautious macro signals', () => {
    const macro = {
      alerts: [],
      strategyShift: 'Defensive zone',
      categoryMultipliers: {
        housing: 1.1, food: 1.2, transport: 1.0, utilities: 1.0, 
        healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: 'Rising inflation',
      indicators: []
    }
    const rec = generateSmartBudget(
      monthlyIncome,
      monthlyDebt,
      'low',
      essentialAverages,
      macro as any,
      'USD'
    )
    // Housing: 1500 * 1.1 = 1650
    expect(rec.allocations.housing).toBe(1650)
    // Food: 500 * 1.2 = 600
    expect(rec.allocations.food).toBe(600)
  })

  it('flags danger when essentials exceed income', () => {
    const rec = generateSmartBudget(1000, 500, 'low', { housing: 1000 })
    expect(rec.alerts.find(a => a.type === 'danger')).toBeDefined()
    expect(rec.userAnalysis.problemDetected).toBe(true)
  })
})

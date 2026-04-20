import { describe, it, expect } from 'vitest'
import { generateSmartBudget, MacroEconomicProfile } from './budget-recommender'

describe('generateSmartBudget with Macro Integration', () => {
  const essentials = { housing: 1000, utilities: 200, food: 300 } // Total: 1500

  it('adjusts essentials based on regional market multipliers', () => {
    const income = 5000
    const debt = 500
    const macro: MacroEconomicProfile = {
      alerts: [],
      strategyShift: "Growth phase",
      categoryMultipliers: {
        housing: 1.0,
        food: 1.10, // 10% grocery spike
        utilities: 1.20, // 20% utility spike
        transport: 1.0, healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: "Regional energy crisis."
    }

    const result = generateSmartBudget(income, debt, 'low', essentials, macro)
    
    // Food: 300 * 1.1 = 330
    // Utilities: 200 * 1.2 = 240
    expect(result.allocations.food).toBe(330)
    expect(result.allocations.utilities).toBe(240)
  })

  it('shifts strategy to savings during an economic downturn', () => {
    const income = 5000
    const debt = 500
    const macro: MacroEconomicProfile = {
      alerts: [{ type: 'warning', message: 'Recession expected' }],
      strategyShift: "Prioritize emergency fund due to downturn",
      categoryMultipliers: {
        housing: 1.0, food: 1.0, utilities: 1.0, transport: 1.0, 
        healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: "Market volatility."
    }

    // Default Low DTI savings is 20%. Downturn should boost it to 30%.
    // Disposable: 5000 - 500 - 1500 = 3000
    // Discretionary rate should drop from 80% to 70% (2100 pool)
    const result = generateSmartBudget(income, debt, 'low', essentials, macro)
    
    // Transport weight 0.25: 2100 * 0.25 = 525
    expect(result.allocations.transport).toBe(525)
    expect(result.alerts[0].message).toBe('Recession expected')
  })

  it('detects a critical deficit when essentials exceed income', () => {
    const income = 1000
    const debt = 500
    const essentials = { housing: 800, utilities: 100, food: 200 } // Total: 1100
    // Income (1000) < (1100 + 500)
    
    const result = generateSmartBudget(income, debt, 'low', essentials)
    
    expect(result.alerts.some(a => a.message.includes('Critical'))).toBe(true)
    expect(result.userAnalysis.advice.some(a => a.includes('discretionary spending'))).toBe(true)
    expect(result.disposableIncome).toBeLessThan(0)
  })

  it('provides specific advice for high DTI status', () => {
    const income = 5000
    const debt = 2500
    const essentials = { housing: 1000, utilities: 200, food: 300 } // Total: 1500
    
    const result = generateSmartBudget(income, debt, 'high', essentials)
    
    expect(result.alerts.some(a => a.message.includes('High Risk'))).toBe(true)
    expect(result.userAnalysis.advice.some(a => a.includes('debt snowball'))).toBe(true)
    expect(result.rationale).toContain('restricted discretionary spend')
  })

  it('handles medium DTI status and fallback multipliers', () => {
    const income = 5000
    const debt = 1000
    const essentials = { housing: 1500 } // Partial essentials
    // mult is undefined, so it uses DEFAULT_MACRO
    
    const result = generateSmartBudget(income, debt, 'medium', essentials as any)
    
    // Medium DTI savings rate is 30%, discretionary 70%
    // Essential total = 1500 + 0 + 0 = 1500
    // Disposable = 5000 - 1000 - 1500 = 2500
    // Pool = 2500 * 0.7 = 1750
    expect(result.totalBudgeted).toBeGreaterThan(0)
    expect(result.allocations.food).toBe(0) // 0 * 1.0 = 0
    expect(result.allocations.transport).toBe(Math.round(1750 * 0.25))
  })

  it('applies fallback 1.0 multiplier when macro category is missing', () => {
    const income = 5000
    const essentials = { housing: 1000, utilities: 200, food: 300 }
    const macro: MacroEconomicProfile = {
      alerts: [],
      strategyShift: "Normal",
      categoryMultipliers: {
        housing: 1.2,
        // food/utilities missing
      } as any,
      rationale: "Testing partial mult",
      indicators: []
    }
    
    const result = generateSmartBudget(income, 0, 'low', essentials, macro)
    expect(result.allocations.food).toBe(300) // 300 * 1.0 fallback
    expect(result.allocations.housing).toBe(1200) // 1000 * 1.2
  })
})

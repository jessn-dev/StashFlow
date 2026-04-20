import { describe, it, expect } from 'vitest'
import { generateSmartBudget, MacroEconomicProfile } from './budget-recommender'
import { ExpenseCategory } from '../types'

describe('Macro-Aware Hybrid Recommender: Regional Performance Testing', () => {
  
  // ── REGION 1: 🇺🇸 USA (High Housing + High Income) ─────────────────────
  it('handles US-style high housing and income during a "Caution" phase', () => {
    const income = 7000
    const debt = 800
    const essentials = { housing: 2400, utilities: 400, food: 600 } // US 3-mo avg
    
    const macro: MacroEconomicProfile = {
      alerts: [{ type: 'info', message: 'US Interest Rates steady' }],
      strategyShift: "Caution: Prioritize Emergency Fund",
      categoryMultipliers: {
        housing: 1.05, // 5% rent hike
        food: 1.08,    // 8% grocery inflation
        utilities: 1.10, // 10% utility hike
        transport: 1.15, healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: "US CPI data shows moderate inflation."
    }

    const result = generateSmartBudget(income, debt, 'low', essentials, macro)
    
    // Housing: 2400 * 1.05 = 2520
    // Food: 600 * 1.08 = 648
    // Utilities: 400 * 1.10 = 440
    // Essential Total: 3608
    expect(result.allocations.housing).toBe(2520)
    expect(result.allocations.food).toBe(648)
    expect(result.totalBudgeted).toBeGreaterThan(3608)
    expect(result.macroRationale).toContain("Caution")
  })

  // ── REGION 2: 🇵🇭 Philippines (High DTI / Debt Sensitive) ────────────────
  it('handles PH-style high DTI risk during economic volatility', () => {
    const income = 45000 // PHP
    const debt = 18000   // High DTI (~40%)
    const essentials = { housing: 12000, utilities: 4000, food: 8000 }
    
    const macro: MacroEconomicProfile = {
      alerts: [{ type: 'warning', message: 'PH PHP/USD Volatility' }],
      strategyShift: "Downturn: Drastically cut discretionary",
      categoryMultipliers: {
        housing: 1.0, food: 1.12, utilities: 1.15, transport: 1.20,
        healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: "PH core inflation hitting essential transport/fuel costs."
    }

    const result = generateSmartBudget(income, debt, 'high', essentials, macro)
    
    // High DTI (40% savings/60% discretionary pool)
    // Plus "Downturn" signal (+10% savings / -10% disc) = 50% / 50%
    const essentialTotal = 12000 + (8000 * 1.12) + (4000 * 1.15) // 12000 + 8960 + 4600 = 25560
    const disposable = 45000 - 18000 - 25560 // 1440
    
    // Pool should be disposable * 0.50 = 720
    // Entertainment (0.10 weight): 720 * 0.10 = 72
    expect(result.allocations.entertainment).toBe(72)
    expect(result.disposableIncome).toBe(1440)
  })

  // ── REGION 3: 🇯🇵 Japan (Deflationary/Low Growth Context) ────────────────
  it('handles Japan-style low multipliers and growth-oriented strategy', () => {
    const income = 450000 // JPY
    const debt = 50000
    const essentials = { housing: 120000, utilities: 25000, food: 60000 }
    
    const macro: MacroEconomicProfile = {
      alerts: [],
      strategyShift: "Growth: Increase discretionary spending",
      categoryMultipliers: {
        housing: 1.0, food: 1.02, utilities: 1.0, transport: 1.0,
        healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: "BOJ maintaining low rates, inflation stable at 2%."
    }

    const result = generateSmartBudget(income, debt, 'low', essentials, macro)
    
    // Disposable: 450000 - 50000 - (120000 + 25000 + 61200) = 450000 - 50000 - 206200 = 193800
    // Savings 20% / Pool 80% (Growth signal doesn't boost pool by default, just stays high)
    const pool = 193800 * 0.8
    expect(result.allocations.personal).toBe(Math.round(pool * 0.20)) // 31008
  })

  // ── REGION 4: 🇬🇧 UK (Interest Rate Sensitive / Energy Hike) ─────────────
  it('handles UK-style energy crisis and interest rate warnings', () => {
    const income = 4200 // GBP
    const debt = 400
    const essentials = { housing: 1400, utilities: 300, food: 400 }
    
    const macro: MacroEconomicProfile = {
      alerts: [{ type: 'warning', message: 'UK Ofgem cap increase expected' }],
      strategyShift: "Caution: Build cash reserves",
      categoryMultipliers: {
        housing: 1.0, food: 1.15, utilities: 1.40, transport: 1.10, // 40% energy spike
        healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: "UK market seeing significant utility cost pressure."
    }

    const result = generateSmartBudget(income, debt, 'low', essentials, macro)
    
    expect(result.allocations.utilities).toBe(420) // 300 * 1.40
    expect(result.alerts[0].message).toContain("Ofgem")
    expect(result.allocations.housing).toBe(1400)
  })

  // ── REGION 5: 🇸🇬 Singapore (Transport & Food Sensitive) ────────────────
  it('handles SG-style transport hikes and rental pressure', () => {
    const income = 8500 // SGD
    const debt = 1500
    const essentials = { housing: 3200, utilities: 350, food: 900 }
    
    const macro: MacroEconomicProfile = {
      alerts: [{ type: 'info', message: 'SG COE Prices High' }],
      strategyShift: "Steady: Maintain current plan",
      categoryMultipliers: {
        housing: 1.12, food: 1.05, utilities: 1.0, transport: 1.25, // 25% transport spike
        healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
      },
      rationale: "SG Rental market remains tight."
    }

    const result = generateSmartBudget(income, debt, 'medium', essentials, macro)
    
    // Housing: 3200 * 1.12 = 3584
    expect(result.allocations.housing).toBe(3584)
    expect(result.allocations.transport).toBeGreaterThan(0)
  })

})

import { ExpenseCategory } from '../types'

export interface MacroEconomicIndicator {
  label: string
  value: string
  status: 'up' | 'down' | 'stable'
  source: string
  category: 'economic' | 'consumer'
}

export interface MacroEconomicProfile {
  alerts: { type: 'warning' | 'info'; message: string }[]
  strategyShift: string
  categoryMultipliers: Record<ExpenseCategory, number>
  rationale: string
  indicators: MacroEconomicIndicator[]
}

export interface BudgetRecommendation {
  allocations: Record<ExpenseCategory, number>
  rationale: string
  alerts: { type: 'warning' | 'info' | 'danger'; message: string }[]
  totalBudgeted: number
  disposableIncome: number
  macroRationale?: string
  userAnalysis: {
    problemDetected: boolean
    advice: string[]
  }
  marketIndicators: MacroEconomicIndicator[]
}

/**
 * Generates a smart budget recommendation based on the Macro-Aware Hybrid model.
 * 
 * Logic:
 * 1. Essentials are locked to the user's 3-month average.
 * 2. Market Multipliers (from FRED, World Bank, OECD) are applied to essentials.
 * 3. Strategy Shift (recession vs growth) is applied to the Discretionary pool.
 * 4. Remaining "Disposable Income" is balanced based on DTI risk.
 */
export function generateSmartBudget(
  monthlyIncome: number,
  monthlyDebt: number,
  dtiStatus: 'low' | 'medium' | 'high',
  essentialAverages: Partial<Record<ExpenseCategory, number>>,
  macroProfile?: MacroEconomicProfile
): BudgetRecommendation {
  // ── Default Fallback Profile ──────────────────────────────────────────────
  const defaultProfile: MacroEconomicProfile = {
    alerts: [],
    strategyShift: dtiStatus === 'high' ? "Defensive: Focus on Debt Reduction" : "Steady: Maintain 20% Savings Rate",
    categoryMultipliers: {
      housing: 1.0, food: 1.0, transport: 1.0, utilities: 1.0, 
      healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
    },
    rationale: "Using standard baseline data. Connect to Market Intel for live regional updates.",
    indicators: []
  }

  const effectiveMacro = macroProfile || defaultProfile
  const allocations: Record<ExpenseCategory, number> = {
    housing: 0,
    food: 0,
    transport: 0,
    utilities: 0,
    healthcare: 0,
    entertainment: 0,
    education: 0,
    personal: 0,
    other: 0
  }

  // 1. Establish Multipliers
  const mult = effectiveMacro.categoryMultipliers

  // 2. Lock in Adjusted Essentials
  allocations.housing = Math.round((essentialAverages.housing || 0) * (mult.housing || 1.0))
  allocations.utilities = Math.round((essentialAverages.utilities || 0) * (mult.utilities || 1.0))
  allocations.food = Math.round((essentialAverages.food || 0) * (mult.food || 1.0))

  const essentialTotal = allocations.housing + allocations.utilities + allocations.food
  const disposableIncome = monthlyIncome - monthlyDebt - essentialTotal

  // 3. User Analysis & Problem Detection
  const alerts: BudgetRecommendation['alerts'] = [...(effectiveMacro.alerts || [])]
  const advice: string[] = []
  let problemDetected = false

  if (monthlyIncome <= (essentialTotal + monthlyDebt)) {
    alerts.push({ type: 'danger', message: 'Critical: Essential expenses & Debt exceed total income.' })
    advice.push('Reduce discretionary spending immediately to avoid new debt.')
    problemDetected = true
  }

  if (dtiStatus === 'high') {
    alerts.push({ type: 'warning', message: 'High Risk Debt-to-Income detected.' })
    advice.push('Your debt load is high. Consider the debt snowball method for active loans.')
    problemDetected = true
  }

  // 4. Determine Savings vs Discretionary Ratio
  let savingsRate = 0.20
  let baseDiscretionaryRate = 0.80
  
  if (dtiStatus === 'high') {
    savingsRate = 0.40
    baseDiscretionaryRate = 0.60
  } else if (dtiStatus === 'medium') {
    savingsRate = 0.30
    baseDiscretionaryRate = 0.70
  }

  // 5. Apply Macro Strategy Shift
  const isCautious = effectiveMacro.strategyShift.toLowerCase().includes('emergency') || 
                    effectiveMacro.strategyShift.toLowerCase().includes('caution') ||
                    effectiveMacro.strategyShift.toLowerCase().includes('downturn') ||
                    effectiveMacro.strategyShift.toLowerCase().includes('defensive')
  
  if (isCautious) {
    savingsRate += 0.10
    baseDiscretionaryRate -= 0.10
    advice.push('Macro-economic signals suggest building a larger cash reserve.')
  }

  // 6. Allocate Discretionary Pool
  const weights: Partial<Record<ExpenseCategory, number>> = {
    transport: 0.25,
    healthcare: 0.20,
    education: 0.15,
    personal: 0.20,
    entertainment: 0.10,
    other: 0.10
  }

  const pool = Math.max(0, disposableIncome * baseDiscretionaryRate)

  Object.entries(weights).forEach(([cat, weight]) => {
    const categoryMult = mult[cat as ExpenseCategory] || 1.0
    allocations[cat as ExpenseCategory] = Math.round(pool * (weight || 0) * categoryMult)
  })

  const totalBudgeted = Object.values(allocations).reduce((a, b) => a + b, 0)

  let finalRationale = effectiveMacro.rationale
  if (dtiStatus === 'high') finalRationale += " We've restricted discretionary spend to prioritize your high debt load."

  return {
    allocations,
    rationale: finalRationale,
    alerts,
    totalBudgeted,
    disposableIncome,
    macroRationale: effectiveMacro.strategyShift,
    userAnalysis: {
      problemDetected,
      advice
    },
    marketIndicators: effectiveMacro.indicators
  }
}

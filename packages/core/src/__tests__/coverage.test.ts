import { describe, it, expect } from 'vitest'
import { generateSmartBudget } from '../analysis/budget'
import { convertAmount, convertToBase } from '../math/currency'
import { calculateDTIRatio } from '../math/dti'
import { generateInstallmentSchedule, recalculateAfterPrepayment } from '../math/loans'
import { getRegionalStrategy } from '../regional'

describe('Coverage Hardening Tests', () => {
  describe('analysis/budget.ts', () => {
    it('covers medium DTI status and custom multipliers', () => {
      const rec = generateSmartBudget(
        5000, 1000, 'medium', 
        { housing: 1000 },
        {
          alerts: [{ type: 'info', message: 'Test Alert' }],
          strategyShift: 'Cautious',
          categoryMultipliers: {
            housing: 1.0, food: 1.0, transport: 1.5, utilities: 1.0, 
            healthcare: 1.0, entertainment: 1.0, education: 1.0, personal: 1.0, other: 1.0
          },
          rationale: 'Test Rationale',
          indicators: []
        }
      )
      expect(rec.rationale).toContain('Test Rationale')
      expect(rec.allocations.transport).toBeGreaterThan(0)
    })

    it('covers critical income scenario where essentials + debt > income', () => {
      const rec = generateSmartBudget(2000, 1500, 'low', { housing: 1000, utilities: 200, food: 300 })
      expect(rec.alerts.find(a => a.type === 'danger')).toBeDefined()
    })

    it('covers branches with missing multipliers or weights', () => {
      // Pass a macro profile with missing multipliers to hit the || 1.0 branch
      const rec = generateSmartBudget(
        5000, 0, 'low', {},
        {
          alerts: [],
          strategyShift: 'Steady',
          categoryMultipliers: {} as any, // Missing all multipliers
          rationale: '',
          indicators: []
        }
      )
      expect(rec.allocations.housing).toBe(0)
    })
  })

  describe('math/currency.ts', () => {
    it('covers convertAmount directly', () => {
      expect(convertAmount(100, 1.5)).toBe(150)
    })

    it('covers triangulation with USD', () => {
      const rates = { 'USD_PHP': 56, 'USD_EUR': 0.92 }
      const result = convertToBase(100, 'PHP', 'EUR', rates)
      expect(result).toBeCloseTo(1.64, 2)
    })

    it('covers missing rates in convertToBase', () => {
      expect(convertToBase(100, 'USD', 'PHP', {})).toBe(100)
    })
  })

  describe('math/dti.ts', () => {
    it('covers high risk ratio (> max)', () => {
      const result = calculateDTIRatio(5000, 3000, 'USD')
      expect(result.status).toBe('high')
    })

    it('covers zero income and zero debt branch', () => {
      const result = calculateDTIRatio(0, 0)
      expect(result.status).toBe('low')
      expect(result.ratio).toBe(0)
    })
  })

  describe('math/loans.ts', () => {
    it('covers edge case return for generateInstallmentSchedule', () => {
      expect(generateInstallmentSchedule({ principal: 0, annualRate: 10, durationMonths: 12, startDate: '2026-01-01' })).toEqual([])
      expect(generateInstallmentSchedule({ principal: 1000, annualRate: 10, durationMonths: -1, startDate: '2026-01-01' })).toEqual([])
    })

    it('covers invalid date in generateInstallmentSchedule', () => {
      expect(generateInstallmentSchedule({ principal: 1000, annualRate: 10, durationMonths: 12, startDate: 'invalid-date' })).toEqual([])
    })

    it('covers shorter_term with zero original payment', () => {
      const result = recalculateAfterPrepayment({
        principal: 0,
        annualRate: 10,
        durationMonths: 12,
        startDate: '2026-01-01',
        currentRemainingBalance: 1000,
        prepaymentAmount: 200,
        target: 'shorter_term'
      })
      expect(result).toEqual([])
    })

    it('covers zero rate in shorter_term recalculation', () => {
      const result = recalculateAfterPrepayment({
        principal: 1000,
        annualRate: 0,
        durationMonths: 10,
        startDate: '2026-01-01',
        currentRemainingBalance: 1000,
        prepaymentAmount: 500,
        target: 'shorter_term'
      })
      expect(result.length).toBe(5) // 500 remaining, 100/mo original = 5 months
    })
  });

  describe('regional strategies', () => {
    it('covers low DTI rationale and haircuts for all strategies', () => {
      const lowDti = { ratio: 10, status: 'low' as const, color: 'green' }
      
      const us = getRegionalStrategy('USD')
      expect(us.getRationale(lowDti)).toContain('healthy')
      expect(us.applyIncomeHaircut('salary', 1000)).toBe(1000)

      const ph = getRegionalStrategy('PHP')
      expect(ph.getRationale(lowDti)).toContain('healthy')
      expect(ph.applyIncomeHaircut('salary', 1000)).toBe(1000)

      const sg = getRegionalStrategy('SGD')
      expect(sg.getRationale(lowDti)).toContain('healthy')
    })
  })
})

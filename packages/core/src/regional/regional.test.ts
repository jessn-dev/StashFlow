import { describe, it, expect } from 'vitest'
import { getRegionalStrategy } from './index'
import { USStrategy } from './strategies/USStrategy'
import { PHStrategy } from './strategies/PHStrategy'
import { SGStrategy } from './strategies/SGStrategy'

describe('Regional Strategy Pattern', () => {
  it('resolves USStrategy for USD', () => {
    const strategy = getRegionalStrategy('USD')
    expect(strategy).toBeInstanceOf(USStrategy)
    expect(strategy.getDTIThresholds()).toEqual({ healthy: 36, max: 43 })
  })

  it('resolves PHStrategy for PHP', () => {
    const strategy = getRegionalStrategy('PHP')
    expect(strategy).toBeInstanceOf(PHStrategy)
    expect(strategy.getDTIThresholds()).toEqual({ healthy: 30, max: 40 })
  })

  it('resolves SGStrategy for SGD', () => {
    const strategy = getRegionalStrategy('SGD')
    expect(strategy).toBeInstanceOf(SGStrategy)
    expect(strategy.getDTIThresholds()).toEqual({ healthy: 45, max: 55 })
  })

  it('fallbacks to USStrategy for unknown currency', () => {
    const strategy = getRegionalStrategy('XYZ')
    expect(strategy).toBeInstanceOf(USStrategy)
  })

  describe('SGStrategy Specifics', () => {
    const sg = new SGStrategy()
    it('applies 30% haircut to bonus income', () => {
      expect(sg.applyIncomeHaircut('Annual Bonus', 1000)).toBe(700)
    })
    it('applies 30% haircut to commission', () => {
      expect(sg.applyIncomeHaircut('Sales Commission', 1000)).toBe(700)
    })
    it('takes 100% of standard salary', () => {
      expect(sg.applyIncomeHaircut('Monthly Salary', 1000)).toBe(1000)
    })
  })

  describe('Regional Rationale Coverage', () => {
    it('provides correct rationale for high DTI', () => {
      const highDti = { ratio: 50, status: 'high' as const, color: 'red' }
      expect(getRegionalStrategy('USD').getRationale(highDti)).toContain('exceeds the US recommended limit')
      expect(getRegionalStrategy('PHP').getRationale(highDti)).toContain('exceeds the PHP recommended limit')
      expect(getRegionalStrategy('SGD').getRationale(highDti)).toContain('exceeds the MAS recommended limit')
    })

    it('provides correct rationale for medium DTI', () => {
      const medDti = { ratio: 40, status: 'medium' as const, color: 'yellow' }
      expect(getRegionalStrategy('USD').getRationale(medDti)).toContain('caution zone for US')
      expect(getRegionalStrategy('PHP').getRationale(medDti)).toContain('caution zone for PHP')
      expect(getRegionalStrategy('SGD').getRationale(medDti)).toContain('caution zone for SGD')
    })
  })
})

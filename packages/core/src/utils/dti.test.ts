import { describe, it, expect } from 'vitest'
import { calculateDTIRatio } from './dti'

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

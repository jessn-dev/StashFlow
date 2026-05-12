import { describe, it, expect } from 'vitest';
import { generateAmortizationSchedule } from '../../math/loans.ts';

describe('loan math', () => {
  const baseParams = {
    principal: 10000,
    annualInterestRate: 0.12, // 12% annual = 1% monthly
    durationMonths: 12,
    startDate: '2026-01-01',
  };

  it('should calculate Standard Amortized loan correctly', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      interestType: 'Standard Amortized',
    });

    // P = 10000, r = 0.01, n = 12
    // M = 10000 * (0.01 * (1.01)^12) / ((1.01)^12 - 1) = 888.48...
    expect(result.monthlyPayment).toBeCloseTo(888.48, 1);
    expect(result.entries).toHaveLength(12);
    expect(result.entries[11]?.remainingBalance).toBeCloseTo(0, 5);
  });

  it('should calculate Interest-Only loan correctly', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      interestType: 'Interest-Only',
    });

    expect(result.monthlyPayment).toBe(100); // 10000 * 0.01
    expect(result.entries[0]?.principalPayment).toBe(0);
    expect(result.entries[11]?.principalPayment).toBe(10000);
    expect(result.entries[11]?.remainingBalance).toBe(0);
  });

  it('should calculate Add-on Interest loan correctly', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      interestType: 'Add-on Interest',
    });

    // Total interest = 10000 * 0.12 * 1 = 1200
    // Monthly payment = (10000 + 1200) / 12 = 933.33
    expect(result.totalInterest).toBe(1200);
    expect(result.monthlyPayment).toBeCloseTo(933.33, 1);
  });

  it('should calculate Fixed Principal loan correctly', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      interestType: 'Fixed Principal',
    });

    // Principal payment = 10000 / 12 = 833.33
    // First interest = 10000 * 0.01 = 100
    // First payment = 933.33
    expect(result.entries[0]?.principalPayment).toBeCloseTo(833.33, 1);
    expect(result.entries[0]?.interestPayment).toBe(100);
    expect(result.monthlyPayment).toBeCloseTo(933.33, 1);
  });

  it('should calculate Fixed Principal loan with 0% interest correctly', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      annualInterestRate: 0,
      interestType: 'Fixed Principal',
    });

    expect(result.monthlyPayment).toBe(10000 / 12);
    expect(result.totalInterest).toBe(0);
  });

  it('should handle 0% interest loan', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      annualInterestRate: 0,
      interestType: 'Standard Amortized',
    });

    expect(result.monthlyPayment).toBe(10000 / 12);
    expect(result.totalInterest).toBe(0);
  });

  it('should handle 0 duration gracefully', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      durationMonths: 0,
      interestType: 'Standard Amortized',
    });

    expect(result.monthlyPayment).toBe(Infinity); // Division by zero in standard formula
    expect(result.entries).toHaveLength(0);
  });

  it('should handle negative principal', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      principal: -10000,
      interestType: 'Standard Amortized',
    });

    expect(result.monthlyPayment).toBeLessThan(0);
    expect(result.totalPayment).toBeLessThan(0);
  });

  describe('Precision and Edge Cases', () => {
    it('should handle large principal values without precision loss', () => {
      const result = generateAmortizationSchedule({
        principal: 10_000_000_000, // 10 Billion
        annualInterestRate: 0.05,
        durationMonths: 120,
        startDate: '2026-01-01',
        interestType: 'Standard Amortized',
      });

      expect(result.monthlyPayment).toBeCloseTo(106065515.24, 0);
      expect(result.entries[119]?.remainingBalance).toBeCloseTo(0, 0);
    });

    it('should maintain accuracy over long durations (30 years)', () => {
      const result = generateAmortizationSchedule({
        principal: 500_000,
        annualInterestRate: 0.07,
        durationMonths: 360, // 30 years
        startDate: '2026-01-01',
        interestType: 'Standard Amortized',
      });

      expect(result.entries).toHaveLength(360);
      expect(result.monthlyPayment).toBeCloseTo(3326.51, 1);
      // Last balance should be zero (within rounding tolerance)
      expect(result.entries[359]?.remainingBalance).toBeCloseTo(0, 2);
    });

    it('should handle extremely high interest rates', () => {
      const result = generateAmortizationSchedule({
        principal: 1000,
        annualInterestRate: 1.0, // 100% interest
        durationMonths: 6,
        startDate: '2026-01-01',
        interestType: 'Standard Amortized',
      });

      expect(result.totalInterest).toBeGreaterThan(250);
      expect(result.entries[5]?.remainingBalance).toBeCloseTo(0, 5);
    });

    it('should handle negative interest rates as a sanity check', () => {
      const result = generateAmortizationSchedule({
        principal: 10000,
        annualInterestRate: -0.01,
        durationMonths: 12,
        startDate: '2026-01-01',
        interestType: 'Standard Amortized',
      });

      expect(result.totalInterest).toBeLessThan(0);
      expect(result.monthlyPayment).toBeLessThan(10000 / 12);
    });
  });
});

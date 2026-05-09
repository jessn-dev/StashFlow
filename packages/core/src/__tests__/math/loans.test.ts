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

  it('should handle 0% interest loan', () => {
    const result = generateAmortizationSchedule({
      ...baseParams,
      annualInterestRate: 0,
      interestType: 'Standard Amortized',
    });

    expect(result.monthlyPayment).toBe(10000 / 12);
    expect(result.totalInterest).toBe(0);
  });
});

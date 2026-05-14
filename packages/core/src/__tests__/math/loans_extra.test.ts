import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateAmortizationSchedule, 
  projectDebtPayoff, 
  computeLoanSparkline 
} from '../../math/loans.ts';

describe('loan math extra coverage', () => {
  const baseParams = {
    principal: 10000,
    annualInterestRate: 0.12,
    durationMonths: 12,
    startDate: '2026-01-01',
  };

  it('should throw error for unsupported interest type', () => {
    expect(() => generateAmortizationSchedule({
      ...baseParams,
      interestType: 'Unsupported' as any,
    })).toThrow('Unsupported interest type: Unsupported');
  });

  describe('Add-on Interest with installmentAmount', () => {
    it('should use solved EIR when installmentAmount is provided', () => {
      // For principal 10000, 12 months, 12% flat rate, payment is ~933.33
      // If we provide an installment that implies a different EIR
      const result = generateAmortizationSchedule({
        ...baseParams,
        interestType: 'Add-on Interest',
        installmentAmount: 950, // Slightly higher than flat rate
      });

      expect(result.monthlyPayment).toBe(950);
      expect(result.entries[0]?.interestPayment).toBeGreaterThan(100); // 1% of 10000 is 100
    });

    it('should fall back to computed EIR if solveMonthlyEir fails (payment too low)', () => {
      const result = generateAmortizationSchedule({
        ...baseParams,
        interestType: 'Add-on Interest',
        installmentAmount: 100, // Way too low for 10000 principal / 12 months
      });

      expect(result.monthlyPayment).toBe(100);
      // Newton-Raphson should fail (payment <= principal/term), using fallback EIR (approx 1.788% monthly)
      expect(result.entries[0]?.interestPayment).toBeCloseTo(178.8, 1); 
    });

    it('should warn on balance drift in Add-on Interest', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Providing a slightly mismatched installment to cause drift
      generateAmortizationSchedule({
        principal: 1000,
        annualInterestRate: 0.1,
        durationMonths: 12,
        startDate: '2026-01-01',
        interestType: 'Add-on Interest',
        installmentAmount: 80, // Flat payment would be (1000 + 100)/12 = 91.66. 80 is too low.
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('solveMonthlyEir edge cases', () => {
    it('should return null for invalid inputs to solveMonthlyEir', () => {
      // payment <= 0 (via installmentAmount)
      const res1 = generateAmortizationSchedule({
        ...baseParams,
        interestType: 'Add-on Interest',
        installmentAmount: 0,
      });
      // Should fall back to computed EIR
      expect(res1.entries[0]?.interestPayment).toBeCloseTo(178.8, 1);

      // We can't easily hit principal <= 0 or term <= 0 in solveMonthlyEir 
      // because they are blocked by generateAmortizationSchedule guard.
      // But we can hit payment <= principal/term
      const res2 = generateAmortizationSchedule({
        ...baseParams,
        interestType: 'Add-on Interest',
        installmentAmount: 500, // Too low: 10000/12 = 833.33
      });
      expect(res2.entries[0]?.interestPayment).toBeCloseTo(178.8, 1);
    });

    it('should return null if r diverges or is implausible', () => {
       // High payment causes high r
       const result = generateAmortizationSchedule({
        principal: 1000,
        annualInterestRate: 0.1,
        durationMonths: 1,
        startDate: '2026-01-01',
        interestType: 'Add-on Interest',
        installmentAmount: 3000, // 3x principal in 1 month
      });
      // NR should handle it or bail if r > 1
      expect(result.monthlyPayment).toBe(3000);
    });
  });

  describe('projectDebtPayoff extra cases', () => {
    it('should handle currency present and rates present', () => {
      const loans = [{
        status: 'active',
        principal: 1000,
        interest_rate: 10,
        duration_months: 10,
        start_date: '2026-01-01',
        interest_type: 'Standard Amortized',
        currency: 'USD'
      }];
      const result = projectDebtPayoff(loans, { USD: 1 });
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle missing currency and missing rates', () => {
      const loans = [{
        status: 'active',
        principal: 1000,
        interest_rate: 10,
        duration_months: 10,
        start_date: '2026-01-01',
        interest_type: 'Standard Amortized',
        // currency missing
      }];
      const rates = {}; // rates missing
      
      const result = projectDebtPayoff(loans, rates);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.total).toBeGreaterThan(0);
    });

    it('should handle edge cases for k=0 and k>0 with various elapsed values', () => {
      vi.useFakeTimers();
      
      // Case: elapsed > 0
      vi.setSystemTime(new Date('2026-02-01'));
      const loans = [{
        status: 'active',
        principal: 1000,
        interest_rate: 0,
        duration_months: 10,
        start_date: '2026-01-01',
        interest_type: 'Standard Amortized',
      }];
      
      const res1 = projectDebtPayoff(loans, { USD: 1 });
      expect(res1[0]?.total).toBe(900); // k=0, idx=0
      expect(res1[1]?.total).toBe(800); // k=1, idx=1
      
      // Case: elapsed = 0
      vi.setSystemTime(new Date('2025-12-01'));
      const res2 = projectDebtPayoff(loans, { USD: 1 });
      // k=0, elapsed=0. schedule.entries[elapsed-1] is undefined.
      // schedule.entries[0] is used.
      expect(res2[0]?.total).toBe(900); 

      vi.useRealTimers();
    });

    it('should use total fallback if all entries are inaccessible', () => {
      const loans = [{
        status: 'active',
        principal: 1000,
        interest_rate: 10,
        duration_months: 0,
        start_date: '2026-01-01',
        interest_type: 'Standard Amortized',
      }];
      // maxRemaining = 0. months = 1.
      // k=0. elapsed=0. entries[0-1] undef, entries[0] undef.
      // fallback to (monthlyPayment * length) = 0 * 0 = 0.
      const result = projectDebtPayoff(loans, { USD: 1 });
      expect(result[0]?.total).toBe(0);
    });
  });

  describe('computeLoanSparkline extra cases', () => {
    it('should hit catch block on unsupported interest type', () => {
      const loan = {
        principal: 1000,
        interest_rate: 10,
        duration_months: 12,
        start_date: '2026-01-01',
        interest_type: 'Unsupported' as any,
      };
      const points = computeLoanSparkline(loan);
      expect(points).toBe('0,36 120,36');
    });

    it('should handle large step in sampling', () => {
      const loan = {
        principal: 1000,
        interest_rate: 10,
        duration_months: 120, // 10 years
        start_date: '2026-01-01',
        interest_type: 'Standard Amortized',
      };
      const points = computeLoanSparkline(loan);
      expect(points).toContain(' ');
    });
  });
});

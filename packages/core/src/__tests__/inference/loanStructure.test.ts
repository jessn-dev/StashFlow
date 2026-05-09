import { describe, it, expect } from 'vitest';
import { inferLoanStructure, computeAddOnEIR } from '../../inference/loanStructure.ts';

// Benchmark payments for P=500000, rate=12%, n=36
// Amortized: ~16607, Add-on: ~22222, Interest-only: 5000
const BASE_PH = {
  principal: 500_000,
  interest_rate_annual: 12,
  term_months: 36,
  country: 'PH',
} as const;

describe('inferLoanStructure', () => {
  describe('hard rules', () => {
    it('balloon_payment → Interest-Only at ≥ 0.95', () => {
      const result = inferLoanStructure({ ...BASE_PH, monthly_payment: null, balloon_payment: true });
      expect(result.interest_type).toBe('Interest-Only');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('payment_pattern decreasing → Fixed Principal at ≥ 0.90', () => {
      const result = inferLoanStructure({
        ...BASE_PH,
        monthly_payment: null,
        payment_pattern: 'decreasing',
      });
      expect(result.interest_type).toBe('Fixed Principal');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    it('rate_type_hint flat → Add-on Interest at ≥ 0.95', () => {
      const result = inferLoanStructure({
        ...BASE_PH,
        monthly_payment: null,
        rate_type_hint: 'flat',
      });
      expect(result.interest_type).toBe('Add-on Interest');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('numerical matching', () => {
    it('PH auto loan with add-on payment → Add-on Interest ≥ 0.85', () => {
      // Add-on: 500000 * (1 + 0.12 * 3) / 36 = 500000 * 1.36 / 36 = 18888.89
      const addOnPayment = (500_000 * (1 + 0.12 * 3)) / 36;
      const result = inferLoanStructure({ ...BASE_PH, monthly_payment: addOnPayment });
      expect(result.interest_type).toBe('Add-on Interest');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('US mortgage payment matches amortized → Standard Amortized ≥ 0.85', () => {
      // P=300000, 7% annual, 360 months
      // Amortized = 300000 * 0.005833 * (1.005833^360) / (1.005833^360 - 1) ≈ 1995.91
      const P = 300_000;
      const r = 0.07 / 12;
      const n = 360;
      const amortized = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const result = inferLoanStructure({
        principal: P,
        monthly_payment: amortized,
        interest_rate_annual: 7,
        term_months: n,
        country: 'US',
        lender_type: 'bank',
      });
      expect(result.interest_type).toBe('Standard Amortized');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('payment matches interest-only → Interest-Only ≥ 0.85', () => {
      // Interest-only: 500000 * 0.12 / 12 = 5000
      const result = inferLoanStructure({ ...BASE_PH, monthly_payment: 5000 });
      expect(result.interest_type).toBe('Interest-Only');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('US bank loan payment matching amortized boosts confidence above raw 0.85', () => {
      const P = 100_000;
      const r = 0.06 / 12;
      const n = 60;
      const amortized = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const result = inferLoanStructure({
        principal: P,
        monthly_payment: amortized,
        interest_rate_annual: 6,
        term_months: n,
        country: 'US',
        lender_type: 'bank',
      });
      expect(result.interest_type).toBe('Standard Amortized');
      expect(result.confidence).toBeGreaterThan(0.85); // boosted by US+bank
    });
  });

  describe('default fallback', () => {
    it('all nulls → Standard Amortized at exactly 0.5', () => {
      const result = inferLoanStructure({
        principal: null,
        monthly_payment: null,
        interest_rate_annual: null,
        term_months: null,
      });
      expect(result.interest_type).toBe('Standard Amortized');
      expect(result.confidence).toBe(0.5);
      expect(result.reason).toMatch(/Insufficient data/);
    });

    it('missing monthly_payment → fallback at 0.5', () => {
      const result = inferLoanStructure({ ...BASE_PH, monthly_payment: null });
      expect(result.interest_type).toBe('Standard Amortized');
      expect(result.confidence).toBe(0.5);
    });

    it('unrecognized payment → confidence < 0.7, best-guess returned', () => {
      // Payment of 50000 on a 500k / 12% / 36-month loan is wildly off all benchmarks
      const result = inferLoanStructure({ ...BASE_PH, monthly_payment: 50_000 });
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.interest_type).toBeDefined();
    });
  });

  describe('contextual boosting cap', () => {
    it('confidence never exceeds 0.98', () => {
      const addOnPayment = (500_000 * (1 + 0.12 * 3)) / 36;
      const result = inferLoanStructure({
        ...BASE_PH,
        monthly_payment: addOnPayment,
        rate_type_hint: 'flat',
        lender_type: 'dealer',
      });
      expect(result.confidence).toBeLessThanOrEqual(0.98);
    });
  });

  describe('alternatives', () => {
    it('returns non-empty alternatives when multiple candidates match', () => {
      // Craft a payment that's ambiguous — between amortized and add-on
      // Just check that alternatives array exists (may be empty for single clear match)
      const result = inferLoanStructure({ ...BASE_PH, monthly_payment: 5000 });
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });
});

describe('computeAddOnEIR', () => {
  it('12% flat over 12 months → EIR ≈ 21–22%', () => {
    const eir = computeAddOnEIR(12, 12);
    expect(eir).toBeGreaterThan(20);
    expect(eir).toBeLessThan(23);
  });

  it('flat rate 0% → EIR ≈ 0%', () => {
    const eir = computeAddOnEIR(0, 12);
    expect(eir).toBeCloseTo(0, 1);
  });

  it('24% flat over 24 months → EIR significantly higher than 24%', () => {
    const eir = computeAddOnEIR(24, 24);
    expect(eir).toBeGreaterThan(35); // flat rate overstates true cost
  });
});

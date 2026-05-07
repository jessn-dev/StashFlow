import { describe, it, expect } from 'vitest';
import { calculateDTIRatio, simulateDTI } from '../../math/dti';

describe('DTI math', () => {
  describe('calculateDTIRatio', () => {
    it('should calculate ratio correctly for US', () => {
      const result = calculateDTIRatio(360, 1000, 'US');
      expect(result.ratio).toBe(0.36);
      expect(result.isHealthy).toBe(true);
      expect(result.threshold).toBe(0.36);
    });

    it('should calculate unhealthy ratio for US', () => {
      const result = calculateDTIRatio(400, 1000, 'US');
      expect(result.ratio).toBe(0.40);
      expect(result.isHealthy).toBe(false);
    });

    it('should calculate healthy ratio for SG with higher threshold', () => {
      const result = calculateDTIRatio(500, 1000, 'SG');
      expect(result.ratio).toBe(0.50);
      expect(result.isHealthy).toBe(true);
      expect(result.threshold).toBe(0.55);
    });

    it('should handle zero income gracefully', () => {
      const result = calculateDTIRatio(100, 0, 'US');
      expect(result.ratio).toBe(1);
      expect(result.label).toBe('No income');
      expect(result.isHealthy).toBe(false);
    });
  });

  describe('simulateDTI', () => {
    it('should project higher DTI when debt increases', () => {
      const result = simulateDTI({
        monthlyIncome: 10000,
        monthlyDebt: 2000,
        addLoanMonthly: 1000,
        region: 'US',
      });

      expect(result.current.ratio).toBe(0.20);
      expect(result.projected.ratio).toBe(0.30);
      expect(result.diffPpt).toBeCloseTo(0.10);
    });

    it('should project lower DTI when income increases', () => {
      const result = simulateDTI({
        monthlyIncome: 10000,
        monthlyDebt: 4000,
        addIncomeMonthly: 10000,
        region: 'US',
      });

      expect(result.current.ratio).toBe(0.40);
      expect(result.projected.ratio).toBe(0.20);
      expect(result.diffPpt).toBeCloseTo(-0.20);
    });

    it('should handle paying off loans', () => {
      const result = simulateDTI({
        monthlyIncome: 10000,
        monthlyDebt: 4000,
        payOffLoanMonthly: 2000,
        region: 'US',
      });

      expect(result.current.ratio).toBe(0.40);
      expect(result.projected.ratio).toBe(0.20);
      expect(result.diffPpt).toBeCloseTo(-0.20);
    });
  });
});

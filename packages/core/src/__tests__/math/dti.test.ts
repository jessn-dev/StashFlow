import { describe, it, expect } from 'vitest';
import { calculateDTIRatio, simulateDTI } from '../../math/dti.ts';

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

    it('should calculate unhealthy ratio for SG with higher threshold', () => {
      const result = calculateDTIRatio(500, 1000, 'SG');
      expect(result.ratio).toBe(0.50);
      expect(result.isHealthy).toBe(false);
      expect(result.threshold).toBe(0.45);
    });

    it('should handle zero income and zero debt', () => {
      const result = calculateDTIRatio(0, 0, 'US');
      expect(result.ratio).toBe(0);
      expect(result.isHealthy).toBe(true);
    });

    it('should handle negative income', () => {
      const result = calculateDTIRatio(100, -100, 'US');
      expect(result.ratio).toBe(1);
      expect(result.isHealthy).toBe(false);
    });
  });

  describe('simulateDTI', () => {
    it('should use default region US if not provided', () => {
      const result = simulateDTI({
        monthlyIncome: 1000,
        monthlyDebt: 200,
      });
      expect(result.current.threshold).toBe(0.36); // US threshold
    });

    it('should handle missing simulation deltas', () => {
      const result = simulateDTI({
        monthlyIncome: 1000,
        monthlyDebt: 200,
        region: 'US',
      });
      expect(result.projected.ratio).toBe(0.20);
      expect(result.diffPpt).toBe(0);
    });

    it('should handle paying off more loan than current debt', () => {
      const result = simulateDTI({
        monthlyIncome: 1000,
        monthlyDebt: 200,
        payOffLoanMonthly: 500,
        region: 'US',
      });
      expect(result.projected.ratio).toBe(0);
    });
  });
});

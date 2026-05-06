import { describe, it, expect } from 'vitest';
import { calculateDTIRatio } from '../../math/dti';

describe('DTI math', () => {
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

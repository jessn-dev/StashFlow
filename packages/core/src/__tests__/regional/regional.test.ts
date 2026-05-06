import { describe, it, expect } from 'vitest';
import { getRegionalStrategy, USStrategy, PHStrategy, SGStrategy } from '../../regional';

describe('regional strategies', () => {
  it('should return correct strategy for US', () => {
    const strategy = getRegionalStrategy('US');
    expect(strategy).toBeInstanceOf(USStrategy);
    expect(strategy.currency).toBe('USD');
  });

  it('should return correct strategy for PH', () => {
    const strategy = getRegionalStrategy('PH');
    expect(strategy).toBeInstanceOf(PHStrategy);
    expect(strategy.currency).toBe('PHP');
  });

  it('should return correct strategy for SG', () => {
    const strategy = getRegionalStrategy('SG');
    expect(strategy).toBeInstanceOf(SGStrategy);
    expect(strategy.currency).toBe('SGD');
  });

  it('should return correct rationale based on ratio', () => {
    const us = new USStrategy();
    expect(us.getRationale(0.2)).toContain('Healthy');
    expect(us.getRationale(0.5)).toContain('High');

    const ph = new PHStrategy();
    expect(ph.getRationale(0.3)).toContain('Within');
    expect(ph.getRationale(0.5)).toContain('Exceeds');

    const sg = new SGStrategy();
    expect(sg.getRationale(0.4)).toContain('TDSR');
    expect(sg.getRationale(0.6)).toContain('Exceeds');
  });
});

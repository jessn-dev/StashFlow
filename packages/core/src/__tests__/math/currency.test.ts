import { describe, it, expect } from 'vitest';
import { convertToBase, formatCurrency } from '../../math/currency.ts';

describe('currency math', () => {
  describe('convertToBase', () => {
    it('should convert amount correctly', () => {
      expect(convertToBase(50, 50)).toBe(1);
      expect(convertToBase(100, 2)).toBe(50);
    });

    it('should return 0 if rate is 0 or negative', () => {
      expect(convertToBase(100, 0)).toBe(0);
      expect(convertToBase(100, -1)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format PHP correctly', () => {
      const formatted = formatCurrency(1000, 'PHP', 'en-PH');
      // en-PH locale uses the symbol ₱ for PHP
      expect(formatted).toMatch(/[₱|PHP]/);
      expect(formatted).toContain('1,000.00');
    });

    it('should format USD correctly', () => {
      const formatted = formatCurrency(1000, 'USD', 'en-US');
      expect(formatted).toContain('$');
      expect(formatted).toContain('1,000.00');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { convertToBase, formatCurrency, type ExchangeRate } from '../../math/currency.ts';

describe('currency math', () => {
  describe('convertToBase', () => {
    const rates: ExchangeRate[] = [
      { base: 'USD', target: 'PHP', rate: 50 },
      { base: 'USD', target: 'SGD', rate: 1.35 },
    ];

    it('should convert amount correctly with rate', () => {
      expect(convertToBase(50, 50)).toBe(1);
    });

    it('should return 0 if rate is 0 or negative', () => {
      expect(convertToBase(100, 0)).toBe(0);
      expect(convertToBase(100, -1)).toBe(0);
    });

    it('should return val if from === base', () => {
      expect(convertToBase(100, 'USD', 'USD', rates)).toBe(100);
    });

    it('should convert via direct rate', () => {
      // 5000 PHP to USD where 1 USD = 50 PHP -> 100 USD
      expect(convertToBase(5000, 'PHP', 'USD', rates)).toBe(100);
    });

    it('should convert via inverse rate', () => {
      // 100 USD to PHP where 1 USD = 50 PHP -> 5000 PHP (inverse logic in convertToBase)
      // Actually, if from is USD and base is PHP, and we have USD->PHP rate = 50.
      // convertToBase(100, 'USD', 'PHP', rates)
      // fromCurrency = 'USD', baseCurrency = 'PHP'
      // direct = rates.find(r => r.base === 'PHP' && r.target === 'USD') -> undefined
      // inverse = rates.find(r => r.base === 'USD' && r.target === 'PHP') -> { rate: 50 }
      // return val * inverse.rate -> 100 * 50 = 5000
      expect(convertToBase(100, 'USD', 'PHP', rates)).toBe(5000);
    });

    it('should convert via triangulation (PHP -> SGD via USD)', () => {
      // 5000 PHP -> 100 USD -> 135 SGD
      expect(convertToBase(5000, 'PHP', 'SGD', rates)).toBeCloseTo(135, 2);
    });

    it('should return val if no rate found', () => {
      expect(convertToBase(100, 'JPY', 'USD', rates)).toBe(100);
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

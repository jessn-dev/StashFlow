import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { projectDebtPayoff, computeLoanSparkline } from '../../math/loans';

describe('loan visualizations', () => {
  const nowStr = '2026-05-11';
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowStr));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockLoans = [
    {
      id: '1',
      status: 'active',
      principal: 10000,
      interest_rate: 0,
      duration_months: 10,
      start_date: nowStr,
      currency: 'USD',
      interest_type: 'Standard Amortized'
    }
  ];
  const rates = { USD: 1, PHP: 50 };

  describe('projectDebtPayoff', () => {
    it('should project debt decline correctly', () => {
      const result = projectDebtPayoff(mockLoans, rates);
      expect(result.length).toBeGreaterThan(0);
      // After 1 month at 0% interest: 10000 - (10000/10) = 9000
      expect(result[0]?.total).toBe(9000);
      expect(result[result.length - 1]?.total).toBe(0);
    });

    it('should handle multi-currency conversion', () => {
      const mixedLoans = [
        ...mockLoans,
        {
          id: '2',
          status: 'active',
          principal: 5000,
          interest_rate: 0,
          duration_months: 5,
          start_date: nowStr,
          currency: 'PHP',
          interest_type: 'Standard Amortized'
        }
      ];
      const result = projectDebtPayoff(mixedLoans, rates);
      // (10000 - 1000) + (5000 - 1000)/50 = 9000 + 80 = 9080
      // Wait, 5000 PHP / 5 months = 1000 PHP/mo. 5000 - 1000 = 4000 PHP remaining.
      // 4000 PHP / 50 rate = 80 USD.
      // 9000 USD + 80 USD = 9080 USD.
      expect(result[0]?.total).toBe(9080);
    });


    it('should return empty if no active loans', () => {
      expect(projectDebtPayoff([], rates)).toEqual([]);
    });
  });

  describe('computeLoanSparkline', () => {
    it('should generate a points string', () => {
      const points = computeLoanSparkline(mockLoans[0]);
      expect(typeof points).toBe('string');
      expect(points).toContain(',');
    });

    it('should fallback to baseline on error', () => {
      const points = computeLoanSparkline({ principal: 0, duration_months: 0 });
      expect(points).toBe('0,36 120,36');
    });
  });
});

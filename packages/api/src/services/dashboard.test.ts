import { describe, it, expect } from 'vitest';
import { DashboardService } from './dashboard';

/**
 * Tests for the DashboardService.
 * Ensures intelligence items are correctly prioritized and generated based on various financial scenarios.
 */
describe('DashboardService', () => {
  const service = new DashboardService();
  const baseData = {
    pendingDocs: [],
    needsReviewDocs: [],
    spendingTrends: [],
    upcomingPayments: [],
    monthlySummary: { count: 10, netFlow: 1000 },
    savingsRate: 20,
    currency: 'USD',
    dtiResult: { isHealthy: true, ratio: 0.2 },
    activeLoansCount: 1,
  };

  it('generates attention item for pending documents', () => {
    const items = service.generateIntelligence({
      ...baseData,
      pendingDocs: [{ id: '1' }],
    });
    expect(items.find(i => i.id === 'docs-processing')).toBeDefined();
  });

  it('generates high priority item for needs review documents', () => {
    const items = service.generateIntelligence({
      ...baseData,
      needsReviewDocs: [{ id: '2' }],
    });
    const item = items.find(i => i.id === 'docs-review');
    expect(item?.priority).toBe('high');
  });

  it('generates trend items for significant increases', () => {
    const items = service.generateIntelligence({
      ...baseData,
      spendingTrends: [{ category: 'food', changePercent: 25, currentAmount: 500 }],
    });
    expect(items.find(i => i.type === 'trend')).toBeDefined();
  });

  it('generates upcoming payment alerts', () => {
    const items = service.generateIntelligence({
      ...baseData,
      upcomingPayments: [{ loanId: 'l1' }],
    });
    expect(items.find(i => i.id === 'upcoming-payments')).toBeDefined();
  });

  it('generates negative cashflow health alert', () => {
    const items = service.generateIntelligence({
      ...baseData,
      monthlySummary: { count: 5, netFlow: -500 },
    });
    expect(items.find(i => i.id === 'negative-cashflow')).toBeDefined();
  });

  it('generates positive cashflow item when feed is quiet', () => {
    const items = service.generateIntelligence({
      ...baseData,
      monthlySummary: { count: 5, netFlow: 500 },
    });
    expect(items.find(i => i.id === 'positive-cashflow')).toBeDefined();
  });

  it('generates DTI health alert when elevated', () => {
    const items = service.generateIntelligence({
      ...baseData,
      dtiResult: { isHealthy: false, ratio: 0.5 },
    });
    expect(items.find(i => i.id === 'dti-elevated')).toBeDefined();
  });
});

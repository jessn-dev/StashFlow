import { IntelligenceItem } from '@stashflow/core';
import { formatCurrency } from '@stashflow/core';

/**
 * Data required to generate dashboard intelligence items.
 */
interface IntelligenceSourceData {
  /** List of documents currently being processed by AI. */
  pendingDocs: any[];
  /** List of documents requiring manual verification. */
  needsReviewDocs: any[];
  /** Spending changes by category compared to the previous period. */
  spendingTrends: { category: string; changePercent: number; currentAmount: number }[];
  /** List of upcoming loan payments. */
  upcomingPayments: any[];
  /** Summary of the current month's transactions. */
  monthlySummary: { count: number; netFlow: number };
  /** Calculated savings rate as a percentage. */
  savingsRate: number;
  /** Preferred display currency. */
  currency: string;
  /** Result of the Debt-to-Income ratio analysis. */
  dtiResult: { isHealthy: boolean; ratio: number };
  /** Count of currently active loans. */
  activeLoansCount: number;
}

/**
 * Service for generating dashboard intelligence items and insights.
 * Analyzes financial data to provide actionable feedback and alerts to the user.
 */
export class DashboardService {
  /**
   * Generates a prioritized list of intelligence items based on the provided data.
   * 
   * @param data - The source data including transactions, loans, and documents.
   * @returns An array of prioritized IntelligenceItem objects.
   * @throws This method is synchronous and does not throw under normal conditions.
   */
  generateIntelligence(data: IntelligenceSourceData): IntelligenceItem[] {
    /*
     * PSEUDOCODE:
     * 1. Initialize an empty intelligence list.
     * 2. Add alerts for documents in progress or requiring review.
     * 3. Add trend items for significant spending increases (>= 20%).
     * 4. Add high-priority alerts for upcoming loan payments.
     * 5. Analyze monthly cash flow and add health items (negative flow, zero transactions).
     * 6. Check DTI ratio health and add warnings if elevated.
     * 7. Apply fatigue control to limit positive feedback if the feed is already busy.
     */
    const { 
      pendingDocs, 
      needsReviewDocs, 
      spendingTrends, 
      upcomingPayments, 
      monthlySummary, 
      savingsRate, 
      currency, 
      dtiResult, 
      activeLoansCount 
    } = data;
    
    const intelligence: IntelligenceItem[] = [];

    // 1. Document Processing Intelligence (High Priority Attention)
    if (pendingDocs.length > 0) {
      intelligence.push({
        id: 'docs-processing',
        type: 'attention',
        priority: 'low',
        summary: `${pendingDocs.length} document${pendingDocs.length > 1 ? 's' : ''} being analyzed.`,
        context: 'Our AI is extracting details from your recent uploads.',
        actions: [{ label: 'View Queue', href: '/dashboard/loans/upload' }]
      });
    }

    if (needsReviewDocs.length > 0) {
      // High priority because manual intervention is needed to finalize financial data.
      intelligence.push({
        id: 'docs-review',
        type: 'attention',
        priority: 'high',
        summary: `${needsReviewDocs.length} document${needsReviewDocs.length > 1 ? 's' : ''} require verification.`,
        context: 'Some extractions have low confidence. Please review and confirm the details.',
        actions: [{ label: 'Review Now', href: `/dashboard/loans/review?doc=${needsReviewDocs[0].id}` }]
      });
    }

    // 2. Trend Intelligence
    spendingTrends.forEach((trend, i) => {
      // We only flag increases of 20% or more to avoid over-notifying users about minor fluctuations.
      if (trend.changePercent >= 20) {
        // Cap display at 999% — anything higher is technically correct but looks like a bug.
        const displayPct = trend.changePercent > 999 ? '999+' : String(trend.changePercent);
        intelligence.push({
          id: `trend-${trend.category}-${i}`,
          type: 'trend',
          priority: trend.changePercent >= 50 ? 'medium' : 'low',
          summary: `${trend.category.charAt(0).toUpperCase() + trend.category.slice(1)} spending increased ${displayPct}% this month.`,
          context: `Based on a comparison of the last 30 days vs the previous period. Total: ${formatCurrency(trend.currentAmount, currency)}`,
          actions: [{ label: 'Analyze', href: '/dashboard/transactions' }]
        });
      }
    });

    // 3. Upcoming Payments
    if (upcomingPayments.length > 0) {
      // High priority because missing a payment has significant financial impact.
      intelligence.push({
        id: 'upcoming-payments',
        type: 'attention',
        priority: 'high',
        summary: `${upcomingPayments.length} loan payment${upcomingPayments.length > 1 ? 's' : ''} due within 7 days.`,
        context: 'Review your loan schedule to stay on track.',
        actions: [{ label: 'View Loans', href: '/dashboard/loans' }],
      });
    }

    // 4. Financial Health & Fatigue Control
    if (monthlySummary.count === 0) {
      intelligence.push({
        id: 'no-transactions',
        type: 'attention',
        priority: 'medium',
        summary: `No transactions recorded this month.`,
        context: 'Add transactions to start generating financial insights.',
        actions: [{ label: 'Add Transaction', href: '/dashboard/transactions' }],
      });
    } else if (monthlySummary.netFlow < 0) {
      // High priority because negative cash flow is a critical health indicator.
      intelligence.push({
        id: 'negative-cashflow',
        type: 'health',
        priority: 'high',
        summary: `Spending exceeded income by ${formatCurrency(Math.abs(monthlySummary.netFlow), currency)} this month.`,
        context: 'Your expenses are outpacing income. Review your spending breakdown.',
        actions: [{ label: 'View Transactions', href: '/dashboard/transactions' }],
      });
    } else if (monthlySummary.netFlow > 0 && intelligence.length < 3) {
      // FATIGUE CONTROL: only show positive cashflow if feed is quiet.
      // We want to highlight critical issues first and only show 'good news' if it doesn't bury alerts.
      intelligence.push({
        id: 'positive-cashflow',
        type: 'health',
        priority: 'low',
        summary: `Cash flow is positive — saving ${formatCurrency(monthlySummary.netFlow, currency)} this month.`,
        context: savingsRate >= 20
          ? `Strong ${savingsRate}% savings rate. Consider directing surplus to a goal.`
          : `Savings rate is ${savingsRate}%. Aim for 20% or more.`,
        actions: [{ label: 'View Plans', href: '/dashboard/plans' }],
      });
    }

    if (!dtiResult.isHealthy && activeLoansCount > 0) {
      // High priority as DTI ratio is a key metric for creditworthiness and financial stability.
      intelligence.push({
        id: 'dti-elevated',
        type: 'health',
        priority: 'high',
        summary: `Debt-to-income ratio is elevated at ${(dtiResult.ratio * 100).toFixed(1)}%.`,
        context: 'Monthly debt obligations exceed recommended thresholds for your region. Consider accelerating repayment.',
        actions: [{ label: 'Review Loans', href: '/dashboard/loans' }],
      });
    }

    return intelligence;
  }
}


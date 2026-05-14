import { formatCurrency, convertToBase } from '@stashflow/core';
import { SnapshotCard } from './SnapshotCard';

/**
 * Properties for the FinancialSnapshotStrip component.
 */
type Props = Readonly<{
  /** The current month's net cash flow. */
  netCashFlow: number;
  /** The user's total net worth. */
  netWorth: number;
  /** Total value of all active liabilities. */
  totalLiabilities: number;
  /** Percentage of income saved this month. */
  savingsRate: number;
  /** Debt-to-Income ratio (decimal). */
  dtiRatio: number;
  /** Whether the DTI ratio is within healthy limits. */
  dtiHealthy: boolean;
  /** Count of active loan accounts. */
  activeLoansCount: number;
  /** The primary currency code (e.g., "USD"). */
  currency: string;
  /** The base currency for normalization (optional). */
  baseCurrency?: string;
  /** Exchange rates for currency conversion (optional). */
  rates?: Record<string, number>;
}>;

/**
 * A horizontal strip of SnapshotCards providing a high-level overview of 
 * the user's financial status on the main dashboard.
 * 
 * @param props - Component properties.
 * @returns A JSX element containing a grid of financial summary cards.
 */
export function FinancialSnapshotStrip({
  netCashFlow,
  netWorth,
  totalLiabilities,
  savingsRate,
  dtiRatio,
  dtiHealthy,
  activeLoansCount,
  currency,
  baseCurrency,
  rates,
}: Props) {
  /*
   * PSEUDOCODE:
   * 1. Determine if net cash flow is positive for display purposes.
   * 2. Check if a base currency conversion should be shown (multi-currency context).
   * 3. Render a responsive grid with 6 SnapshotCards.
   * 4. Map each financial metric to a SnapshotCard with appropriate formatting, colors, and indicators.
   */
  const cashFlowPositive = netCashFlow >= 0;

  // Decide whether to show the base currency equivalent to help users with multi-currency accounts
  const showBase = baseCurrency && rates && currency !== baseCurrency;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <SnapshotCard
        label="Net Cash Flow"
        value={(cashFlowPositive ? '+' : '') + formatCurrency(netCashFlow, currency)}
        baseValue={showBase ? formatCurrency(convertToBase(netCashFlow, rates![currency] ?? 1), baseCurrency!) : undefined}
        valueColor={cashFlowPositive ? 'text-emerald-600' : 'text-red-500'}
        supporting={cashFlowPositive ? 'Positive this month' : 'Negative this month'}
      />
      <SnapshotCard
        label="Net Worth"
        value={formatCurrency(netWorth, currency)}
        baseValue={showBase ? formatCurrency(convertToBase(netWorth, rates![currency] ?? 1), baseCurrency!) : undefined}
        valueColor={netWorth >= 0 ? 'text-gray-900' : 'text-gray-500'}
        supporting="Excl. untracked assets"
      />
      <SnapshotCard
        label="Total Liabilities"
        value={formatCurrency(totalLiabilities, currency)}
        baseValue={showBase ? formatCurrency(convertToBase(totalLiabilities, rates![currency] ?? 1), baseCurrency!) : undefined}
        supporting={`${activeLoansCount} active loan${activeLoansCount !== 1 ? 's' : ''}`}
      />
      <SnapshotCard
        label="Savings Rate"
        value={`${savingsRate > 0 ? '+' : ''}${savingsRate}%`}
        valueColor={savingsRate >= 20 ? 'text-emerald-600' : savingsRate > 0 ? 'text-gray-900' : 'text-red-500'}
        supporting="Of monthly income"
      />
      <SnapshotCard
        label="DTI Ratio"
        value={`${(dtiRatio * 100).toFixed(1)}%`}
        valueColor={dtiHealthy ? 'text-emerald-600' : 'text-amber-600'}
        supporting={dtiHealthy ? 'Within limits' : 'Above threshold'}
        indicator={dtiHealthy ? 'healthy' : 'warning'}
      />
      <SnapshotCard
        label="Active Loans"
        value={String(activeLoansCount)}
        supporting="Tracked liabilities"
      />
    </div>
  );
}

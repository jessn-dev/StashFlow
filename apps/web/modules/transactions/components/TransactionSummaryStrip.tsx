import { formatCurrency } from '@stashflow/core';
import type { PeriodSummary } from '@stashflow/api';

/**
 * A compact summary strip displaying key financial metrics for a specific period.
 * 
 * @param props - Component properties.
 * @param props.summary - The financial summary data for the period.
 * @param props.filteredCount - The total number of transactions currently visible in the list.
 * @returns A grid-based horizontal bar of metric tiles.
 */
export function TransactionSummaryStrip({
  summary,
  filteredCount,
}: {
  summary: PeriodSummary;
  filteredCount: number;
}) {
  // PSEUDOCODE:
  // 1. Determine if the net flow for the period is positive or negative.
  // 2. Format the net flow value with a leading '+' if positive.
  // 3. Render a grid container with four tiles:
  //    - Net Flow (highlighted)
  //    - Total Income
  //    - Total Expenses
  //    - Transaction Count (the filtered total)

  const positive = summary.netFlow >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricTile
        label="Net Flow"
        // Force positive sign for clarity in growth metrics
        value={(positive ? '+' : '') + formatCurrency(summary.netFlow, summary.currency)}
        valueColor={positive ? 'text-emerald-600' : 'text-red-500'}
        prominent
      />
      <MetricTile label="Income" value={formatCurrency(summary.totalIncome, summary.currency)} />
      <MetricTile label="Expenses" value={formatCurrency(summary.totalExpenses, summary.currency)} />
      <MetricTile label="Transactions" value={String(filteredCount)} />
    </div>
  );
}

/**
 * A small, labeled tile for displaying a single numerical or currency metric.
 */
function MetricTile({
  label,
  value,
  valueColor = 'text-gray-900',
  prominent = false,
}: {
  /** The descriptive label for the metric. */
  label: string;
  /** The formatted value to display. */
  value: string;
  /** Tailwind text color class for the value. */
  valueColor?: string;
  /** If true, the tile will have a slightly darker border to draw attention. */
  prominent?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border px-5 py-4 shadow-sm ${prominent ? 'border-gray-300' : 'border-gray-200'}`}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      {/* tabular-nums used to prevent horizontal jitter when values update */}
      <p className={`text-2xl font-black tracking-tight tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

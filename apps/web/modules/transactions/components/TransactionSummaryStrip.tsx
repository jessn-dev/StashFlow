import { formatCurrency } from '@stashflow/core';
import type { PeriodSummary } from '@stashflow/api';

export function TransactionSummaryStrip({
  summary,
  filteredCount,
}: {
  summary: PeriodSummary;
  filteredCount: number;
}) {
  const positive = summary.netFlow >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricTile
        label="Net Flow"
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

function MetricTile({
  label,
  value,
  valueColor = 'text-gray-900',
  prominent = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  prominent?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border px-5 py-4 shadow-sm ${prominent ? 'border-gray-300' : 'border-gray-200'}`}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tight tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

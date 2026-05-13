import { TransactionSummary, formatCurrency } from '@stashflow/core';

/**
 * Renders a grid of three summary cards showing financial overview: Income, Expenses, and Net Cash Flow.
 * 
 * @param props - Component properties.
 * @param props.summary - The financial summary data to display.
 * @returns A grid layout containing three SummaryCard components.
 */
export function TransactionSummaryCards({ summary }: Readonly<{ summary: TransactionSummary }>) {
  // PSEUDOCODE:
  // 1. Receive transaction summary object from props.
  // 2. Map high-level metrics (total income, total expenses, net flow) to individual SummaryCard components.
  // 3. Apply conditional coloring for net flow based on its positive or negative value.
  // 4. Return the grid of cards.

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SummaryCard 
        label="Total Income" 
        value={formatCurrency(summary.totalIncome, summary.currency)} 
        color="text-green-600"
      />
      <SummaryCard 
        label="Total Expenses" 
        value={formatCurrency(summary.totalExpenses, summary.currency)} 
        color="text-red-600"
      />
      <SummaryCard 
        label="Net Cash Flow" 
        value={formatCurrency(summary.netFlow, summary.currency)} 
        color={summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}
        isNet
        isPositive={summary.netFlow >= 0}
      />
    </div>
  );
}

/**
 * Individual metric card showing a label and a formatted currency value.
 */
function SummaryCard({ 
  label, 
  value, 
  color, 
  isNet, 
  isPositive 
}: Readonly<{ 
  /** High-level label for the metric (e.g., "Total Income"). */
  label: string; 
  /** Formatted currency string. */
  value: string; 
  /** Tailwind text color class. */
  color: string;
  /** Whether this card represents a 'net' calculation. */
  isNet?: boolean;
  /** Whether the net value is positive (affects prefixing). */
  isPositive?: boolean;
}>) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-gray-300 transition-colors">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className={`text-3xl font-black tracking-tighter ${color}`}>
        {/* Explicit '+' prefix for positive net values to emphasize growth */}
        {isNet && isPositive && '+'}{value}
      </h3>
      <p className="text-[10px] text-gray-400 font-medium mt-1">Current Month</p>
      
      {/* 
          Decorative subtle background icon/shape. 
          Using opacity and font-weight to create a "watermark" effect that 
          responds to hover for a more "alive" feel.
      */}
      <div className={`absolute -right-2 -bottom-2 opacity-[0.03] text-6xl font-black select-none pointer-events-none group-hover:scale-110 transition-transform`}>
        {isNet ? '±' : label.includes('Income') ? '↓' : '↑'}
      </div>
    </div>
  );
}

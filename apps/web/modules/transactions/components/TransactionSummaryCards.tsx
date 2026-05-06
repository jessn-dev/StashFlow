import { TransactionSummary, formatCurrency } from '@stashflow/core';

export function TransactionSummaryCards({ summary }: { summary: TransactionSummary }) {
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

function SummaryCard({ 
  label, 
  value, 
  color, 
  isNet, 
  isPositive 
}: { 
  label: string; 
  value: string; 
  color: string;
  isNet?: boolean;
  isPositive?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-gray-300 transition-colors">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className={`text-3xl font-black tracking-tighter ${color}`}>
        {isNet && isPositive && '+'}{value}
      </h3>
      <p className="text-[10px] text-gray-400 font-medium mt-1">Current Month</p>
      
      {/* Decorative subtle background icon/shape */}
      <div className={`absolute -right-2 -bottom-2 opacity-[0.03] text-6xl font-black select-none pointer-events-none group-hover:scale-110 transition-transform`}>
        {isNet ? '±' : label.includes('Income') ? '↓' : '↑'}
      </div>
    </div>
  );
}

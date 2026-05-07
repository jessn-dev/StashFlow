import { formatCurrency } from '@stashflow/core';

interface Props {
  netCashFlow: number;
  netWorth: number;
  totalLiabilities: number;
  savingsRate: number;
  dtiRatio: number;
  dtiHealthy: boolean;
  activeLoansCount: number;
  currency: string;
}

export function FinancialSnapshotStrip({
  netCashFlow,
  netWorth,
  totalLiabilities,
  savingsRate,
  dtiRatio,
  dtiHealthy,
  activeLoansCount,
  currency,
}: Props) {
  const cashFlowPositive = netCashFlow >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <SnapshotCard
        label="Net Cash Flow"
        value={(cashFlowPositive ? '+' : '') + formatCurrency(netCashFlow, currency)}
        valueColor={cashFlowPositive ? 'text-emerald-600' : 'text-red-500'}
        supporting={cashFlowPositive ? 'Positive this month' : 'Negative this month'}
      />
      <SnapshotCard
        label="Net Worth"
        value={formatCurrency(netWorth, currency)}
        valueColor={netWorth >= 0 ? 'text-gray-900' : 'text-gray-500'}
        supporting="Excl. untracked assets"
      />
      <SnapshotCard
        label="Total Liabilities"
        value={formatCurrency(totalLiabilities, currency)}
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

function SnapshotCard({
  label,
  value,
  supporting,
  valueColor = 'text-gray-900',
  indicator,
}: {
  label: string;
  value: string;
  supporting?: string;
  valueColor?: string;
  indicator?: 'healthy' | 'warning';
}) {
  return (
    <div
      className="bg-white rounded-[20px] border border-gray-200 shadow-sm flex flex-col justify-between"
      style={{ minHeight: '112px', padding: '20px' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-gray-400 leading-tight">{label}</p>
        {indicator && (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              indicator === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        )}
      </div>
      <div>
        <p
          className={`font-bold tabular-nums leading-none mb-1 ${valueColor}`}
          style={{ fontSize: '30px', letterSpacing: '-0.02em' }}
        >
          {value}
        </p>
        {supporting && (
          <p className="text-[12px] text-gray-400 leading-tight">{supporting}</p>
        )}
      </div>
    </div>
  );
}

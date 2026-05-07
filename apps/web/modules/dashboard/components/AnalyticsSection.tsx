import { CashFlowChart, SpendingPieChart } from './DashboardCharts';
import type { HistoricalSummary, SpendingByCategory } from '@stashflow/api';

interface AnalyticsSectionProps {
  history: HistoricalSummary[];
  spending: SpendingByCategory[];
  currency: string;
}

export function AnalyticsSection({ history, spending, currency }: AnalyticsSectionProps) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Analytics</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Cash Flow Trend" 
          subtitle="6-month income vs. expenses"
          hasData={history.length > 0}
        >
          <CashFlowChart data={history} currency={currency} />
        </ChartCard>

        <ChartCard 
          title="Spending by Category" 
          subtitle="Top expenses this month"
          hasData={spending.length > 0}
        >
          <SpendingPieChart data={spending} currency={currency} />
        </ChartCard>

        <ChartPlaceholder title="Net Worth Trend" subtitle="Track wealth over time" />
        <ChartPlaceholder title="Debt Payoff Projection" subtitle="Time to debt-free" />
      </div>
    </div>
  );
}

function ChartCard({ 
  title, 
  subtitle, 
  children, 
  hasData 
}: { 
  title: string; 
  subtitle: string; 
  children: React.ReactNode;
  hasData: boolean;
}) {
  return (
    <div
      className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col"
      style={{ minHeight: '380px', padding: '24px', borderRadius: '24px' }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-base font-bold text-gray-900">{title}</p>
      </div>
      <p className="text-sm text-gray-400 mb-6">{subtitle}</p>

      {hasData ? (
        <div className="flex-1 flex items-center justify-center">
          {children}
        </div>
      ) : (
        <EmptyChartState />
      )}
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
      <div className="flex items-end gap-1.5 h-16 opacity-20">
        {[40, 60, 35, 75, 55, 80, 50, 90, 65, 70, 45, 85].map((h, i) => (
          <div
            key={i}
            className="w-4 bg-gray-400 rounded-t-sm"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 font-medium">
        Add transactions to unlock charts
      </p>
    </div>
  );
}

function ChartPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col"
      style={{ minHeight: '380px', padding: '24px', borderRadius: '24px' }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-base font-bold text-gray-900">{title}</p>
      </div>
      <p className="text-sm text-gray-400 mb-6">{subtitle}</p>
      <EmptyChartState />
    </div>
  );
}

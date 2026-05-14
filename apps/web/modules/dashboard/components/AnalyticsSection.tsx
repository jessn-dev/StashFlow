import { CashFlowChart, SpendingPieChart, NetWorthChart } from './DashboardCharts';
import { DebtPayoffChart, type DebtPayoffPoint } from './DebtPayoffChart';
import { CashFlowProjectionChart } from './CashFlowProjectionChart';
import type { HistoricalSummary, SpendingByCategory } from '@stashflow/api';

/**
 * Properties for the AnalyticsSection component.
 */
type AnalyticsSectionProps = Readonly<{
  /** Historical cash flow data. */
  history: HistoricalSummary[];
  /** Breakdown of spending by category. */
  spending: SpendingByCategory[];
  /** Historical net worth data points. */
  netWorthHistory: { month: string; netWorth: number }[];
  /** Projected debt payoff timeline data. */
  payoffData: DebtPayoffPoint[];
  /** The currency code for all financial values. */
  currency: string;
}>;

/**
 * Renders the analytics dashboard containing various financial charts.
 * 
 * @param props - Component properties.
 * @returns A JSX element containing the analytics section.
 */
export function AnalyticsSection({
  history,
  spending,
  netWorthHistory,
  payoffData,
  currency,
}: AnalyticsSectionProps) {
  /*
   * PSEUDOCODE:
   * 1. Render the section header.
   * 2. Create a responsive grid layout for chart cards.
   * 3. Instantiate ChartCard components for Cash Flow, Spending, Net Worth, and Debt Payoff.
   * 4. Pass relevant data and currency to each chart component.
   * 5. Handle empty states internally via the hasData prop on ChartCard.
   */
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

        <ChartCard
          title="Net Worth Trend"
          subtitle="Total assets minus liabilities"
          hasData={netWorthHistory.length > 0}
        >
          <NetWorthChart data={netWorthHistory} currency={currency} />
        </ChartCard>

        <ChartCard
          title="Debt Payoff Projection"
          subtitle="Time to debt-free"
          hasData={payoffData.length > 0}
        >
          <DebtPayoffChart data={payoffData} currency={currency} />
        </ChartCard>
      </div>

      {/* 12-month forward projection — full width, fetched client-side */}
      <ChartCard
        title="12-Month Cash Flow Projection"
        subtitle="Projected income, expenses, and debt payments"
        hasData={true}
      >
        <CashFlowProjectionChart currency={currency} />
      </ChartCard>
    </div>
  );
}

/**
 * A wrapper component for dashboard charts that provides a consistent title,
 * subtitle, and empty state handling.
 * 
 * @param props - Component properties.
 */
function ChartCard({ 
  title, 
  subtitle, 
  children, 
  hasData 
}: Readonly<{ 
  /** The title of the chart card. */
  title: string; 
  /** A brief description or subtitle for the chart. */
  subtitle: string; 
  /** The chart component to render. */
  children: React.ReactNode;
  /** Whether there is data available to render the chart. */
  hasData: boolean;
}>) {
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

/**
 * Renders a placeholder state for charts with no data available.
 */
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

/**
 * A simpler chart placeholder used during loading or as a fallback.
 */
function ChartPlaceholder({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
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

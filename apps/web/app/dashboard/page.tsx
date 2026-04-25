import { createClient } from '@/lib/supabase/server';
import { 
  DashboardServiceFactory
} from '@stashflow/api';
import { formatCurrency } from '@stashflow/core';

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dashboardService = DashboardServiceFactory.create(supabase);
  const data = await dashboardService.getDashboardData(user.id);

  return (
    <div className="space-y-8">
      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Net Worth" 
          value={formatCurrency(data.netWorth, data.currency)} 
        />
        <MetricCard 
          label="Monthly Cash Flow" 
          value={formatCurrency(data.monthlyCashFlow, data.currency)} 
        />
        <MetricCard 
          label="Total Liabilities" 
          value={formatCurrency(data.totalLiabilities, data.currency)} 
          subValue="Active debt"
        />
        <MetricCard 
          label="DTI Ratio" 
          value={`${(data.dtiRatio * 100).toFixed(1)}%`}
          isHealthy={data.dtiHealthy}
          subValue={data.dtiHealthy ? 'Within healthy limits' : 'Above threshold'}
        />
      </div>

      {/* Placeholder for charts/recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white rounded-xl border shadow-sm h-64 flex items-center justify-center text-gray-400">
          Chart: Net Worth Trend (Coming Soon)
        </div>
        <div className="p-6 bg-white rounded-xl border shadow-sm h-64 flex items-center justify-center text-gray-400">
          Recent Activity (Coming Soon)
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  subValue, 
  isHealthy 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  isHealthy?: boolean;
}) {
  return (
    <div className="p-6 bg-white rounded-xl border shadow-sm">
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
      {subValue && (
        <p className={`text-xs mt-1 ${isHealthy === false ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {subValue}
        </p>
      )}
    </div>
  );
}

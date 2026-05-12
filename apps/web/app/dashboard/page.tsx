import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '~/lib/supabase/server';
import { ApiServiceFactory } from '@stashflow/api';
import {
  convertToBase,
  getRegionByCurrency,
  calculateDTIRatio,
  projectDebtPayoff,
} from '@stashflow/core';
import { FinancialSnapshotStrip } from '~/modules/dashboard/components/FinancialSnapshotStrip';
import { IntelligenceFeed } from '~/modules/dashboard/components/IntelligenceFeed';
import { RightUtilityRail } from '~/modules/dashboard/components/RightUtilityRail';
import { AnalyticsSection } from '~/modules/dashboard/components/AnalyticsSection';

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Profile upsert — safety net for OAuth logins
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  const today = new Date().toISOString().split('T')[0]!;
  const monthStart = today.slice(0, 7) + '-01';

  const api = new ApiServiceFactory(supabase);

  const [
    profile,
    monthlySummary,
    loans,
    assets,
    snapshots,
    paymentSummaries,
    rates,
    history,
    spending,
    pendingDocs,
    spendingTrends,
  ] = await Promise.all([
    api.profiles.get(user.id),
    api.transactions.getSummaryForPeriod(user.id, monthStart, today),
    api.loans.getAll(user.id),
    api.assets.getAll(user.id),
    api.netWorthSnapshots.getAll(user.id),
    api.loans.getPaymentSummaries(user.id),
    api.exchangeRates.getLatest(),
    api.transactions.getHistoricalSummaries(user.id, 6),
    api.transactions.getSpendingByCategory(user.id, monthStart, today),
    supabase
      .from('documents')
      .select('id, file_name, processing_status, extracted_data')
      .eq('user_id', user.id)
      .or('processing_status.eq.processing,processing_status.eq.pending,processing_status.eq.success')
      .order('created_at', { ascending: false }),
    api.transactions.getTrendAnalysis(user.id),
  ]);

  // Compute metrics
  const totalLiabilities = loans.reduce(
    (sum, l) => sum + convertToBase(l.principal, rates[l.currency] ?? 1),
    0,
  );
  const totalAssets = assets.reduce(
    (sum, a) => sum + convertToBase(a.balance, rates[a.currency] ?? 1),
    0,
  );
  const monthlyDebtService = loans.reduce(
    (sum, l) => sum + convertToBase(l.installment_amount, rates[l.currency] ?? 1),
    0,
  );

  const { totalIncome, totalExpenses, netFlow: netCashFlow } = monthlySummary;
  const currency = profile?.preferred_currency || monthlySummary.currency || 'USD';
  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;
  const netWorth = totalAssets - totalLiabilities;

  const region = getRegionByCurrency(currency);
  const dtiResult = calculateDTIRatio(monthlyDebtService, totalIncome, region);
  
  // Use centralized debt payoff projection
  const payoffData = projectDebtPayoff(loans, rates);

  // 1. Build Intelligence Feed via DashboardService
  const intelligence = api.dashboardService.generateIntelligence({
    pendingDocs: pendingDocs.data?.filter(d => d.processing_status === 'processing' || d.processing_status === 'pending') || [],
    needsReviewDocs: pendingDocs.data?.filter(d => 
      d.processing_status === 'success' && 
      (d.extracted_data as any)?.validation?.requires_verification === true
    ) || [],
    spendingTrends,
    upcomingPayments: paymentSummaries.filter((p) => {
      if (!p.nextDueDate) return false;
      const days = Math.ceil((new Date(p.nextDueDate).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 7;
    }),
    monthlySummary,
    savingsRate,
    currency,
    dtiResult,
    activeLoansCount: loans.length,
  });

  // Analytics Section
  const netWorthHistory = snapshots.map((s) => ({
    month: s.snapshot_date.slice(0, 7),
    netWorth: Number(s.net_worth),
  }));

  // Fallback for net worth history if no snapshots exist
  if (netWorthHistory.length === 0 && (totalAssets > 0 || totalLiabilities > 0)) {
    netWorthHistory.push({
      month: today.slice(0, 7),
      netWorth,
    });
  }

  // Compute subtitle
  const subtitle = netCashFlow >= 0
    ? `Cash flow is positive this ${new Date().toLocaleString('en-US', { month: 'long' })}.`
    : `Spending exceeded income in ${new Date().toLocaleString('en-US', { month: 'long' })}.`;

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-bold tracking-tight text-gray-900 leading-none"
            style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.1' }}
          >
            Overview
          </h1>
          <p className="text-[15px] text-gray-400 font-medium mt-2" style={{ lineHeight: '1.5' }}>
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/dashboard/transactions/import"
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-900 rounded-xl transition-all"
          >
            Import
          </Link>
          <button
            disabled
            title="Coming soon"
            className="px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-200 rounded-xl cursor-not-allowed"
          >
            Export
          </button>
        </div>
      </div>

      {/* Financial Snapshot Strip */}
      <FinancialSnapshotStrip
        netCashFlow={netCashFlow}
        netWorth={netWorth}
        totalLiabilities={totalLiabilities}
        savingsRate={savingsRate}
        dtiRatio={dtiResult.ratio}
        dtiHealthy={dtiResult.isHealthy}
        activeLoansCount={loans.length}
        currency={currency}
        baseCurrency="USD"
        rates={rates}
      />

      {/* Main Grid — Intelligence Feed + Right Rail */}
      <div className="grid grid-cols-12 gap-6">
        {/* Intelligence Feed — 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            Intelligence Feed
          </p>
          <IntelligenceFeed items={intelligence} />
        </div>

        {/* Right Utility Rail — 4 cols */}
        <div className="col-span-12 lg:col-span-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            Utilities
          </p>
          <RightUtilityRail
            loans={loans}
            paymentSummaries={paymentSummaries}
            currency={currency}
            dtiRatio={dtiResult.ratio}
            dtiHealthy={dtiResult.isHealthy}
            savingsRate={savingsRate}
          />
        </div>
      </div>

      {/* Analytics Section */}
      <AnalyticsSection
        history={history}
        spending={spending}
        netWorthHistory={netWorthHistory}
        payoffData={payoffData}
        currency={currency}
      />
    </div>
  );
}

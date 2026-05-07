import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  TransactionQuery,
  LoanQuery,
  ExchangeRateQuery,
  ProfileQuery,
} from '@stashflow/api';
import {
  convertToBase,
  getRegionByCurrency,
  calculateDTIRatio,
  formatCurrency,
  generateAmortizationSchedule,
} from '@stashflow/core';
import type { DebtPayoffPoint } from '@/modules/dashboard/components/DebtPayoffChart';
import type { Loan } from '@stashflow/core';
import { FinancialSnapshotStrip } from '@/modules/dashboard/components/FinancialSnapshotStrip';
import { IntelligenceFeed } from '@/modules/dashboard/components/IntelligenceFeed';
import { RightUtilityRail } from '@/modules/dashboard/components/RightUtilityRail';
import { AnalyticsSection } from '@/modules/dashboard/components/AnalyticsSection';
import type { IntelligenceItem } from '@/modules/dashboard/components/IntelligenceFeed';

function computeDebtPayoff(loans: Loan[], rates: Record<string, number>): DebtPayoffPoint[] {
  const active = loans.filter((l) => l.status === 'active');
  if (!active.length) return [];

  const now = new Date();

  // Compute schedules and current month offset per loan
  const schedules = active.map((loan) => {
    const start = new Date(loan.start_date);
    const elapsed = Math.max(
      0,
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
    );
    const schedule = generateAmortizationSchedule({
      principal: loan.principal,
      annualInterestRate: loan.interest_rate / 100,
      durationMonths: loan.duration_months,
      startDate: loan.start_date,
      interestType: loan.interest_type ?? 'Standard Amortized',
    });
    const rate = rates[loan.currency] ?? 1;
    return { schedule, elapsed, rate };
  });

  const maxRemaining = Math.max(
    ...schedules.map((s) => Math.max(0, s.schedule.entries.length - s.elapsed)),
  );
  const months = Math.min(maxRemaining + 1, 121);

  return Array.from({ length: months }, (_, k) => {
    const date = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    const total = schedules.reduce((sum, { schedule, elapsed, rate }) => {
      const idx = elapsed + k - 1;
      const remaining = k === 0
        ? (schedule.entries[elapsed - 1]?.remainingBalance ?? schedule.entries[0]?.remainingBalance ?? schedule.monthlyPayment * schedule.entries.length)
        : (schedule.entries[idx]?.remainingBalance ?? 0);
      return sum + convertToBase(Math.max(0, remaining), rate);
    }, 0);
    return { month, total: Math.round(total * 100) / 100 };
  });
}

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

  const profileQuery = new ProfileQuery(supabase);
  const transactionQuery = new TransactionQuery(supabase);
  const loanQuery = new LoanQuery(supabase);
  const rateQuery = new ExchangeRateQuery(supabase);

  const [profile, monthlySummary, loans, paymentSummaries, rates, history, spending] = await Promise.all([
    profileQuery.get(user.id),
    transactionQuery.getSummaryForPeriod(user.id, monthStart, today),
    loanQuery.getAll(user.id),
    loanQuery.getPaymentSummaries(user.id),
    rateQuery.getLatest(),
    transactionQuery.getHistoricalSummaries(user.id, 6),
    transactionQuery.getSpendingByCategory(user.id, monthStart, today),
  ]);

  // Compute metrics
  const totalLiabilities = loans.reduce(
    (sum, l) => sum + convertToBase(l.principal, rates[l.currency] ?? 1),
    0,
  );
  const monthlyDebtService = loans.reduce(
    (sum, l) => sum + convertToBase(l.installment_amount, rates[l.currency] ?? 1),
    0,
  );

  const { totalIncome, totalExpenses, netFlow: netCashFlow } = monthlySummary;
  const currency = profile?.preferred_currency || monthlySummary.currency || 'USD';
  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;
  const netWorth = -totalLiabilities; // assets not tracked yet

  const region = getRegionByCurrency(currency);
  const dtiResult = calculateDTIRatio(monthlyDebtService, totalIncome, region);
  const payoffData = computeDebtPayoff(loans, rates);

  // Compute subtitle
  const subtitle = netCashFlow >= 0
    ? `Cash flow is positive this ${new Date().toLocaleString('en-US', { month: 'long' })}.`
    : `Spending exceeded income in ${new Date().toLocaleString('en-US', { month: 'long' })}.`;

  // Build intelligence objects
  const intelligence: IntelligenceItem[] = [];

  const upcomingThisWeek = paymentSummaries.filter((p) => {
    if (!p.nextDueDate) return false;
    const days = Math.ceil((new Date(p.nextDueDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  });

  if (upcomingThisWeek.length > 0) {
    intelligence.push({
      id: 'upcoming-payments',
      type: 'attention',
      priority: 'high',
      summary: `${upcomingThisWeek.length} loan payment${upcomingThisWeek.length > 1 ? 's' : ''} due within 7 days.`,
      context: 'Review your loan schedule to stay on track.',
      actions: [{ label: 'View Loans', href: '/dashboard/loans' }],
    });
  }

  if (monthlySummary.count === 0) {
    intelligence.push({
      id: 'no-transactions',
      type: 'attention',
      priority: 'medium',
      summary: `No transactions recorded this ${new Date().toLocaleString('en-US', { month: 'long' })}.`,
      context: 'Add transactions to start generating financial insights.',
      actions: [{ label: 'Add Transaction', href: '/dashboard/transactions' }],
    });
  } else if (netCashFlow < 0) {
    intelligence.push({
      id: 'negative-cashflow',
      type: 'health',
      priority: 'high',
      summary: `Spending exceeded income by ${formatCurrency(Math.abs(netCashFlow), currency)} this month.`,
      context: 'Your expenses are outpacing income. Review your spending breakdown.',
      actions: [{ label: 'View Transactions', href: '/dashboard/transactions' }],
    });
  } else if (netCashFlow > 0) {
    intelligence.push({
      id: 'positive-cashflow',
      type: 'health',
      priority: 'low',
      summary: `Cash flow is positive — saving ${formatCurrency(netCashFlow, currency)} this month.`,
      context: savingsRate >= 20
        ? `Strong ${savingsRate}% savings rate. Consider directing surplus to a goal.`
        : `Savings rate is ${savingsRate}%. Aim for 20% or more.`,
      actions: [{ label: 'View Plans', href: '/dashboard/plans' }],
    });
  }

  if (!dtiResult.isHealthy && loans.length > 0) {
    intelligence.push({
      id: 'dti-elevated',
      type: 'health',
      priority: 'high',
      summary: `Debt-to-income ratio is elevated at ${(dtiResult.ratio * 100).toFixed(1)}%.`,
      context: 'Monthly debt obligations exceed recommended thresholds for your region. Consider accelerating repayment.',
      actions: [{ label: 'Review Loans', href: '/dashboard/loans' }],
    });
  } else if (dtiResult.isHealthy && loans.length > 0) {
    intelligence.push({
      id: 'dti-healthy',
      type: 'health',
      priority: 'low',
      summary: `Debt-to-income ratio is within healthy limits at ${(dtiResult.ratio * 100).toFixed(1)}%.`,
      context: 'Your monthly obligations are manageable relative to your income.',
    });
  }

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
          <button
            disabled
            title="Coming soon"
            className="px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-200 rounded-xl cursor-not-allowed"
          >
            Import
          </button>
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
      <AnalyticsSection history={history} spending={spending} payoffData={payoffData} currency={currency} />
    </div>
  );
}

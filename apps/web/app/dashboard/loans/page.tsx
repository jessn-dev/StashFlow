import { createClient } from '~/lib/supabase/server';
import { ApiServiceFactory } from '@stashflow/api';
import { 
  formatCurrency, 
  computeLoanSparkline, 
  Loan, 
  LoanMetrics 
} from '@stashflow/core';
import Link from 'next/link';
import { AddLoanButton } from '~/modules/loans/components/AddLoanButton';
import { LoanUploadZone } from '~/modules/loans/components/LoanUploadZone';

function StatusBadge({ status }: Readonly<{ status: string | null }>) {
  const s = status ?? 'active';
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-500',
    defaulted: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[s] ?? styles.active}`}>
      {s}
    </span>
  );
}

function LoanCard({ loan, metrics }: Readonly<{ loan: Loan; metrics: LoanMetrics }>) {
  const sparkPoints = computeLoanSparkline(loan);
  const nextPayment = metrics.nextDueDate
    ? new Date(metrics.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{loan.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {loan.lender ? `${loan.lender} · ` : ''}
            {loan.interest_type ?? 'Standard Amortized'}
          </p>
        </div>
        <StatusBadge status={loan.status} />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Remaining</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(metrics.remainingBalance, loan.currency)}</p>
          <span className="inline-block text-[10px] font-medium bg-gray-100 text-gray-500 rounded px-1 mt-0.5">
            {loan.currency}
          </span>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Monthly</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(loan.installment_amount, loan.currency)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Rate</p>
          <p className="text-sm font-bold text-gray-900">{loan.interest_rate}% APR</p>
        </div>
      </div>

      {/* Sparkline */}
      <svg width="100%" height="36" viewBox="0 0 120 36" preserveAspectRatio="none" className="text-indigo-400">
        <polyline
          points={sparkPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>{metrics.paidPercent}% paid</span>
          {nextPayment && <span>Next: {nextPayment}</span>}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all"
            style={{ width: `${metrics.paidPercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-1 border-t border-gray-100">
        <Link
          href={`/dashboard/loans/${loan.id}`}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View Amortization →
        </Link>
      </div>
    </div>
  );
}

/**
 * Main dashboard page for managing user loans.
 * Displays aggregate debt metrics, DTI ratio, and a list of active loans with amortization sparklines.
 */
export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const api = new ApiServiceFactory(supabase);
  const data = await api.loansService.getLoansPageData(user.id);
  const { 
    loans, 
    loanMetrics, 
    totalDebt, 
    totalMonthlyInstallment, 
    avgInterestRate, 
    activeLoanCount, 
    dtiRatio, 
    dtiHealthy, 
    currency 
  } = data;

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between mb-6 py-2 bg-gray-50">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Loans &amp; Payments</h1>
        </div>
        <AddLoanButton />
      </div>

      {/* Metrics strip */}
      <div className="bg-gray-900 text-white rounded-2xl px-6 py-5 flex items-center gap-0 mb-8 overflow-x-auto">
        <div className="flex-1 min-w-[120px]">
          <p className="text-gray-400 text-xs mb-1">Total Debt</p>
          <p className="text-2xl font-bold">{loans.length > 0 ? formatCurrency(totalDebt, currency) : '—'}</p>
          {loans.length > 0 && (
            <p className="text-gray-500 text-[10px] mt-0.5">All values in {currency}</p>
          )}
        </div>
        <div className="w-px h-10 bg-gray-700 mx-6 flex-shrink-0" />
        <div className="flex-1 min-w-[120px]">
          <p className="text-gray-400 text-xs mb-1">Monthly Payments</p>
          <p className="text-2xl font-bold">{loans.length > 0 ? formatCurrency(totalMonthlyInstallment, currency) : '—'}</p>
        </div>
        <div className="w-px h-10 bg-gray-700 mx-6 flex-shrink-0" />
        <div className="flex-1 min-w-[100px]">
          <p className="text-gray-400 text-xs mb-1">Avg Rate</p>
          <p className="text-2xl font-bold">{loans.length > 0 ? `${avgInterestRate.toFixed(1)}%` : '—'}</p>
        </div>
        <div className="w-px h-10 bg-gray-700 mx-6 flex-shrink-0" />
        <div className="flex-1 min-w-[100px]">
          <p className="text-gray-400 text-xs mb-1">DTI Ratio</p>
          {activeLoanCount > 0 ? (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{(dtiRatio * 100).toFixed(1)}%</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dtiHealthy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {dtiHealthy ? 'Healthy' : 'High'}
              </span>
            </div>
          ) : (
            <p className="text-2xl font-bold">—</p>
          )}
        </div>
        <div className="w-px h-10 bg-gray-700 mx-6 flex-shrink-0" />
        <div className="flex-shrink-0">
          <p className="text-gray-400 text-xs mb-1">Base Currency</p>
          <span className="inline-block bg-white/10 text-white text-sm font-semibold px-3 py-1 rounded-lg">
            {currency}
          </span>
        </div>
      </div>

      {/* Loan list or empty state */}
      {loans.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Loans
              <span className="ml-2 text-sm font-normal text-gray-400">({activeLoanCount})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loans.map(loan => (
              <LoanCard key={loan.id} loan={loan} metrics={loanMetrics[loan.id] ?? { paidCount: 0, paidPercent: 0, remainingBalance: loan.principal, nextDueDate: null }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-16 px-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add your first loan</h2>
      <p className="text-gray-400 text-sm text-center max-w-sm mb-8">
        Track payments, see your amortization schedule, and monitor your debt health.
      </p>

      <LoanUploadZone />

      <div className="flex items-center gap-4 mt-6">
        <Link
          href="/dashboard/loans/new"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
        >
          Enter details manually
        </Link>
        <span className="text-gray-300">·</span>
        <Link
          href="/dashboard/loans/example"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
        >
          See example
        </Link>
      </div>
    </div>
  );
}

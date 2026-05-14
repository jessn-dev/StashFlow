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
import { 
  MoreHorizontal, 
  ChevronRight, 
  Clock, 
  Banknote, 
  CalendarDays,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';

/**
 * A visual badge indicating the current status of a loan.
 * 
 * @param props - Component props.
 * @param props.status - The status string (e.g., 'active', 'completed', 'defaulted').
 * @returns A styled span element.
 */
function StatusBadge({ status }: Readonly<{ status: string | null }>) {
  const s = status ?? 'active';
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    completed: 'bg-slate-100 text-slate-500 border-slate-200',
    defaulted: 'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${styles[s] ?? styles.active}`}>
      {s}
    </span>
  );
}

/**
 * A card component displaying detailed information and metrics for a single loan.
 * 
 * @param props - Component props.
 * @param props.loan - The loan data object.
 * @param props.metrics - The metrics associated with the loan.
 * @returns A formatted loan card component.
 */
function LoanCard({ loan, metrics }: Readonly<{ loan: Loan; metrics: LoanMetrics }>) {
  const nextPayment = metrics.nextDueDate
    ? new Date(metrics.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  // STRATEGIC: Ensure we don't show negative months if the loan is over-paid
  const remainingMonths = Math.max(0, (loan.duration_months || 0) - metrics.paidCount);
  const yearsLeft = Math.floor(remainingMonths / 12);
  const monthsLeft = remainingMonths % 12;
  
  const timeStr = yearsLeft > 0 
    ? `${yearsLeft}y ${monthsLeft}m left`
    : `${monthsLeft}m left`;

  return (
    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 flex flex-col h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{loan.name}</h3>
          <p className="text-[12px] text-slate-400 font-medium mt-0.5">
            {loan.lender || 'Private'} • {loan.interest_rate}% APR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={loan.status} />
          <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Main Metric */}
      <div className="mb-8">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Remaining Balance</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-[32px] font-black text-slate-900">
            {formatCurrency(metrics.remainingBalance, loan.currency)}
          </h2>
          <span className="text-xs font-bold text-slate-400">{loan.currency}</span>
        </div>
      </div>

      {/* Grid context */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CalendarDays size={10} /> Next Payment
          </p>
          <p className="text-sm font-bold text-slate-900">
            {nextPayment ? `${nextPayment} • ${formatCurrency(loan.installment_amount ?? 0, loan.currency)}` : 'Completed'}
          </p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Clock size={10} /> Timeline
          </p>
          <p className="text-sm font-bold text-slate-900">{timeStr}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-2.5">
          <p className="text-[13px] font-bold text-slate-900">{metrics.paidPercent}% paid off</p>
          <p className="text-[11px] font-medium text-slate-400">{loan.duration_months - metrics.paidCount} payments left</p>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${metrics.paidPercent}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
        <button className="h-11 bg-slate-900 text-white text-[13px] font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/5">
          <Banknote size={16} /> Record Payment
        </button>
        <Link
          href={`/dashboard/loans/${loan.id}`}
          className="h-11 border border-slate-200 text-slate-600 text-[13px] font-bold rounded-xl hover:border-slate-900 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
        >
          View Details <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}

/**
 * Main dashboard page for managing user loans.
 * Displays aggregate debt metrics, DTI ratio, and a list of active loans with amortization sparklines.
 * 
 * @returns The rendered loans dashboard page.
 */
export default async function LoansPage() {
  /**
   * PSEUDOCODE:
   * 1. Initialize Supabase client and retrieve authenticated user.
   * 2. If no user, terminate early (protected route logic handles redirect elsewhere).
   * 3. Fetch consolidated loan data via ApiServiceFactory.
   * 4. Destructure metrics, loan list, and AI-driven insights.
   * 5. Format the "Next Due" summary string for the header metrics.
   * 6. Render the responsive dashboard layout:
   *    a. Header with "Add Loan" action.
   *    b. Summary grid showing Total Debt, DTI Health, etc.
   *    c. Horizontal scroll of upcoming payments (if any).
   *    d. Main loan list (or Empty State if no loans exist).
   *    e. AI Insights section for debt optimization.
   */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const api = new ApiServiceFactory(supabase);
  const data = await api.loansService.getLoansPageData(user.id);
  
  // STRATEGIC: We extract 'insights' separately to ensure UI doesn't crash if AI service is lagging
  const { 
    loans, 
    loanMetrics, 
    totalDebt, 
    totalMonthlyInstallment, 
    activeLoanCount, 
    dtiHealthy, 
    currency,
    nextPaymentDate,
    nextPaymentAmount,
    upcomingPayments,
    insights
  } = data;

  const nextDueStr = nextPaymentDate 
    ? `${new Date(nextPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${formatCurrency(nextPaymentAmount ?? 0, currency)}`
    : 'None';

  return (
    <div className="max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-10">Loans & Payments</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your debt portfolio and track payoff progress.</p>
        </div>
        <AddLoanButton />
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
          <p className="text-[13px] font-medium text-slate-500 mb-1">Total Debt</p>
          <p className="text-[30px] font-bold text-slate-900">{loans.length > 0 ? formatCurrency(totalDebt, currency) : '—'}</p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
          <p className="text-[13px] font-medium text-slate-500 mb-1">Monthly Payments</p>
          <p className="text-[30px] font-bold text-slate-900">{loans.length > 0 ? formatCurrency(totalMonthlyInstallment, currency) : '—'}</p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
          <p className="text-[13px] font-medium text-slate-500 mb-1">Next Due</p>
          <p className="text-[20px] font-bold text-slate-900 mt-1">{nextDueStr}</p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm relative group">
          <p className="text-[13px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
            Debt Health
            <span className="w-3.5 h-3.5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] cursor-help">?</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${dtiHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <p className="text-[24px] font-bold text-slate-900">{dtiHealthy ? 'Healthy' : 'High'}</p>
          </div>
          {/* Tooltip */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 bg-slate-900 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
            {dtiHealthy 
              ? 'Your monthly debt payments are well below recommended limits.' 
              : 'Your monthly debt obligations are higher than recommended for your income level.'}
          </div>
        </div>
      </div>

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <div className="mb-12">
          <h2 className="text-[20px] font-bold text-slate-900 mb-5">Upcoming Payments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingPayments.map(payment => (
              <div key={payment.loanId} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:border-slate-200 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                    {new Date(payment.dueDate).toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    {new Date(payment.dueDate).getDate()}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{payment.loanName}</p>
                  <p className="text-xs font-medium text-slate-400">{formatCurrency(payment.amount, payment.currency)}</p>
                </div>
                <Link 
                  href={`/dashboard/loans/${payment.loanId}`}
                  className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                >
                  <span className="text-xs">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loan list or empty state */}
          {loans.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-[24px] font-bold text-slate-900">
                  Loan Portfolio
                  <span className="ml-2 text-sm font-medium text-slate-400">({activeLoanCount} active)</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
                {loans.map(loan => (
                  <LoanCard key={loan.id} loan={loan} metrics={loanMetrics[loan.id] ?? { paidCount: 0, paidPercent: 0, remainingBalance: loan.principal, nextDueDate: null }} />
                ))}
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles size={20} className="text-blue-600" />
                    <h2 className="text-[20px] font-bold text-slate-900">Insights & Recommendations</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((insight, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          insight.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                          insight.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {insight.type === 'warning' ? <AlertTriangle size={20} /> :
                           insight.type === 'success' ? <CheckCircle2 size={20} /> :
                           <Info size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 mb-1">{insight.title}</p>
                          <p className="text-sm text-slate-500 leading-relaxed">{insight.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

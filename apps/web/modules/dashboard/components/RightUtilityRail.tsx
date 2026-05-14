import Link from 'next/link';
import { formatCurrency } from '@stashflow/core';
import type { Loan } from '@stashflow/core';
import type { PaymentSummary } from '@stashflow/api';
import { CurrencyConverterWidget } from './CurrencyConverterWidget';

interface UpcomingPayment {
  loanId: string;
  loanName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysUntil: number;
}

type Props = Readonly<{
  loans: Loan[];
  paymentSummaries: PaymentSummary[];
  currency: string;
  dtiRatio: number;
  dtiHealthy: boolean;
  savingsRate: number;
}>;

/**
 * Calculates upcoming loan payments within a 30-day window.
 * 
 * @param loans - Array of all active loans.
 * @param summaries - Payment summaries containing due dates.
 * @returns Array of formatted upcoming payment objects, sorted by proximity.
 */
function computeUpcoming(loans: Loan[], summaries: PaymentSummary[]): UpcomingPayment[] {
  /*
   * PSEUDOCODE:
   * 1. Map payment summaries by loan ID for efficient lookup.
   * 2. Iterate through each loan and check for a corresponding summary.
   * 3. Calculate the day difference between today and the next due date.
   * 4. Filter for dates that fall within the next 30 days (excluding past dates).
   * 5. Sort the resulting list so the most immediate payments appear first.
   */
  const today = Date.now();
  const summaryMap = new Map(summaries.map((s) => [s.loanId, s]));

  return loans
    .flatMap((loan) => {
      const summary = summaryMap.get(loan.id);
      if (!summary?.nextDueDate) return [];
      const due = new Date(summary.nextDueDate).getTime();
      const daysUntil = Math.ceil((due - today) / 86400000);
      
      // BUSINESS RULE: Only show payments due in the next 30 days to keep the rail focused.
      if (daysUntil < 0 || daysUntil > 30) return [];
      
      return [{
        loanId: loan.id,
        loanName: loan.name,
        amount: loan.installment_amount,
        currency: loan.currency,
        dueDate: summary.nextDueDate,
        daysUntil,
      }];
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * A standard container for items in the right utility rail.
 * 
 * @param props - Component properties.
 */
function RailCard({ children, title, action }: Readonly<{ 
  /** Content to display within the card. */
  children: React.ReactNode; 
  /** The title shown in the card header. */
  title: string; 
  /** Optional action element (e.g., a "View All" link) in the header. */
  action?: React.ReactNode 
}>) {
  return (
    <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/**
 * Renders the right-hand utility rail containing upcoming payments, 
 * financial health indicators, and active plans.
 * 
 * @param props - Component properties.
 * @returns A JSX element representing the utility rail.
 */
export function RightUtilityRail({ loans, paymentSummaries, currency, dtiRatio, dtiHealthy, savingsRate }: Props) {
  const upcoming = computeUpcoming(loans, paymentSummaries);

  return (
    <div className="space-y-4">
      {/* Currency Rates */}
      <RailCard title="Currency Rates">
        <CurrencyConverterWidget defaultCurrency={currency} />
      </RailCard>

      {/* Upcoming Payments */}
      <RailCard
        title="Upcoming Payments"
        action={
          <Link href="/dashboard/loans" className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors">
            All loans →
          </Link>
        }
      >
        {upcoming.length === 0 ? (
          loans.length === 0 ? (
            <p className="text-sm text-gray-400">No loans tracked yet.</p>
          ) : (
            <p className="text-sm text-gray-400">No payments due in the next 30 days.</p>
          )
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 4).map((p) => (
              <div key={p.loanId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.loanName}</p>
                  <p className="text-[11px] text-gray-400">
                    {p.daysUntil === 0
                      ? 'Due today'
                      : p.daysUntil === 1
                      ? 'Due tomorrow'
                      : `Due in ${p.daysUntil}d`}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums text-gray-900 flex-shrink-0">
                  {formatCurrency(p.amount, p.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </RailCard>

      {/* Financial Health */}
      <RailCard title="Financial Health">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-500">Debt-to-Income</p>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  dtiHealthy
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {(dtiRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  dtiHealthy ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(dtiRatio * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {dtiHealthy ? 'Within healthy limits (< 36%)' : 'Above recommended threshold'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-500">Savings Rate</p>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  savingsRate >= 20
                    ? 'bg-emerald-50 text-emerald-700'
                    : savingsRate > 0
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {savingsRate > 0 ? '+' : ''}{savingsRate}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  savingsRate >= 20 ? 'bg-emerald-500' : savingsRate > 0 ? 'bg-gray-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(Math.abs(savingsRate), 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {savingsRate >= 20 ? 'Strong savings behavior' : savingsRate > 0 ? 'Below recommended 20%' : 'Spending exceeds income'}
            </p>
          </div>
        </div>
      </RailCard>

      {/* Active Plans */}
      <RailCard title="Active Plans">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <p className="text-sm text-gray-400 mb-3">No plans created yet.</p>
          <Link
            href="/dashboard/plans"
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Create a plan →
          </Link>
        </div>
      </RailCard>
    </div>
  );
}

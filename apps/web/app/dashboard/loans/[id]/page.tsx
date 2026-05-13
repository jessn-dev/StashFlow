import { createClient } from '~/lib/supabase/server';
import { ApiServiceFactory } from '@stashflow/api';
import {
  generateAmortizationSchedule,
  formatCurrency,
  LoanInterestType,
  LoanPayment,
} from '@stashflow/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type DetailPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

function getPaymentStatus(dueDate: string, payments: LoanPayment[]): 'paid' | 'overdue' | 'pending' {
  const match = payments.find(p => p.due_date === dueDate);
  if (!match) return 'pending';
  return (match.status as 'paid' | 'overdue' | 'pending') ?? 'pending';
}

function StatusPill({ status }: Readonly<{ status: 'paid' | 'overdue' | 'pending' }>) {
  if (status === 'paid') return <span className="text-green-600 font-medium">✓</span>;
  if (status === 'overdue') return <span className="text-red-500 font-medium">!</span>;
  return <span className="text-gray-300">–</span>;
}

export default async function LoanDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const loansService = new ApiServiceFactory(supabase).loansService;
  const detail = await loansService.getLoanDetail(id, user.id);

  if (!detail) notFound();

  const { loan, payments } = detail;

  const schedule = generateAmortizationSchedule({
    principal: loan.principal,
    annualInterestRate: loan.interest_rate / 100,
    durationMonths: loan.duration_months,
    startDate: loan.start_date,
    interestType: (loan.interest_type ?? 'Standard Amortized') as LoanInterestType,
    ...(loan.interest_basis ? { interestBasis: loan.interest_basis } : {}),
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-500',
    defaulted: 'bg-red-100 text-red-600',
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Link href="/dashboard/loans" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-block">
        ← Back to Loans &amp; Payments
      </Link>

      {/* Loan header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{loan.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {loan.lender ? `${loan.lender} · ` : ''}
            {loan.interest_type ?? 'Standard Amortized'} ·
            {' '}{loan.interest_rate}% APR ·
            {' '}{loan.duration_months} months
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {loan.start_date} → {loan.end_date}
            <span className="ml-3 font-medium text-gray-500">{loan.currency}</span>
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 mt-1 ${statusColors[loan.status ?? 'active'] ?? statusColors.active}`}>
          {loan.status ?? 'active'}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Monthly Payment</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(schedule.monthlyPayment, loan.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Total Interest</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(schedule.totalInterest, loan.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(schedule.totalPayment, loan.currency)}</p>
        </div>
      </div>

      {/* Amortization table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Amortization Schedule</h2>
          <p className="text-xs text-gray-400 mt-0.5">{schedule.entries.length} payments</p>
        </div>
        <div className="overflow-auto max-h-[540px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Principal</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Interest</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Balance</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schedule.entries.map(entry => {
                const paymentStatus = getPaymentStatus(entry.dueDate, payments);
                const rowClass = paymentStatus === 'paid'
                  ? 'bg-green-50/40'
                  : paymentStatus === 'overdue'
                  ? 'bg-red-50/40'
                  : 'hover:bg-gray-50';

                return (
                  <tr key={entry.period} className={`transition-colors ${rowClass}`}>
                    <td className="px-6 py-2.5 text-gray-500 tabular-nums">{entry.period}</td>
                    <td className="px-4 py-2.5 text-gray-500">{entry.dueDate}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{formatCurrency(entry.principalPayment, loan.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{formatCurrency(entry.interestPayment, loan.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-900">{formatCurrency(entry.remainingBalance, loan.currency)}</td>
                    <td className="px-6 py-2.5 text-center">
                      <StatusPill status={paymentStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

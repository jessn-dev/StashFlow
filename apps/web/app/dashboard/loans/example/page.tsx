import Link from 'next/link';
import { generateAmortizationSchedule, formatCurrency } from '@stashflow/core';

const EXAMPLE_LOAN = {
  name: 'Home Loan (Example)',
  lender: 'BDO Unibank',
  principal: 2_000_000,
  currency: 'PHP',
  interest_rate: 5.5,
  duration_months: 120,
  start_date: new Date().toISOString().slice(0, 10),
  interest_type: 'Standard Amortized' as const,
  installment_amount: 21_678,
  status: 'active',
};

export default function ExampleLoanPage() {
  const schedule = generateAmortizationSchedule({
    principal: EXAMPLE_LOAN.principal,
    annualInterestRate: EXAMPLE_LOAN.interest_rate,
    durationMonths: EXAMPLE_LOAN.duration_months,
    startDate: EXAMPLE_LOAN.start_date,
    interestType: EXAMPLE_LOAN.interest_type,
  });

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Example banner */}
      <div className="mb-6 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm text-amber-800 font-medium">
          This is an example loan — data is not saved.
        </p>
        <Link
          href="/dashboard/loans/new"
          className="text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700 flex-shrink-0"
        >
          Add your own loan →
        </Link>
      </div>

      <Link href="/dashboard/loans" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-block">
        ← Back to Loans
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{EXAMPLE_LOAN.name}</h1>
          <p className="text-gray-400 text-sm mt-1">{EXAMPLE_LOAN.lender} · {EXAMPLE_LOAN.interest_type}</p>
        </div>
        <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full mt-1">active</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Monthly Payment</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(schedule.monthlyPayment, EXAMPLE_LOAN.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Total Interest</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(schedule.totalInterest, EXAMPLE_LOAN.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(schedule.totalPayment, EXAMPLE_LOAN.currency)}</p>
        </div>
      </div>

      {/* Amortization table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Amortization Schedule</h2>
          <p className="text-xs text-gray-400 mt-0.5">{schedule.entries.length} payments · {EXAMPLE_LOAN.interest_type}</p>
        </div>
        <div className="overflow-auto max-h-[520px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Principal</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Interest</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schedule.entries.map(entry => (
                <tr key={entry.period} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-2.5 text-gray-500 tabular-nums">{entry.period}</td>
                  <td className="px-4 py-2.5 text-gray-500">{entry.dueDate}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{formatCurrency(entry.principalPayment, EXAMPLE_LOAN.currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{formatCurrency(entry.interestPayment, EXAMPLE_LOAN.currency)}</td>
                  <td className="px-6 py-2.5 text-right tabular-nums font-medium text-gray-900">{formatCurrency(entry.remainingBalance, EXAMPLE_LOAN.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

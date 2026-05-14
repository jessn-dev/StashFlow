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
import { LoanActionMenu } from '~/modules/loans/components/LoanActionMenu';
import { PaymentStatusChip } from '~/modules/loans/components/PaymentStatusChip';
import { 
  ArrowLeft, 
  CalendarDays, 
  TrendingUp, 
  CreditCard,
  Building2,
  PieChart
} from 'lucide-react';

type DetailPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

function getPaymentStatus(dueDate: string, payments: LoanPayment[]): 'paid' | 'overdue' | 'upcoming' {
  const match = payments.find(p => p.due_date === dueDate);
  if (match?.status === 'paid') return 'paid';
  
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (due < today) return 'overdue';
  return 'upcoming';
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
    ...(loan.installment_amount ? { installmentAmount: loan.installment_amount } : {}),
  });

  // Calculate current progress
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const currentEntry = schedule.entries[paidCount] || schedule.entries[schedule.entries.length - 1];
  const remainingBalance = currentEntry?.remainingBalance ?? 0;

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Link 
        href="/dashboard/loans" 
        className="text-sm text-slate-400 hover:text-slate-900 transition-colors mb-8 inline-flex items-center gap-2 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
      </Link>

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
               <Building2 size={24} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">{loan.name}</h1>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{loan.lender || 'Private Lender'}</p>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <TrendingUp size={14} className="text-blue-500" /> {loan.interest_rate}% APR
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <CalendarDays size={14} className="text-slate-400" /> {loan.duration_months} months
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <CreditCard size={14} className="text-slate-400" /> {loan.currency}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LoanActionMenu loanId={loan.id} currentStatus={loan.status ?? 'active'} />
          <button className="h-12 bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            Edit Loan
          </button>
        </div>
      </div>

      {/* Dashboard Context Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Remaining Balance</p>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(remainingBalance, loan.currency)}</p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Next Payment</p>
          <p className="text-3xl font-black text-slate-900">
            {formatCurrency(schedule.monthlyPayment, loan.currency)}
          </p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Interest</p>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(schedule.totalInterest, loan.currency)}</p>
        </div>
      </div>

      {/* Amortization Experience */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden mb-20">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Amortization Schedule</h2>
            <p className="text-sm font-medium text-slate-400">{schedule.entries.length} scheduled payments</p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-blue-500" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Principal</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-slate-200" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interest</span>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-auto max-h-[640px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">#</th>
                <th className="px-4 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-4 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Split</th>
                <th className="px-4 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Payment</th>
                <th className="px-4 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {schedule.entries.map(entry => {
                const status = getPaymentStatus(entry.dueDate, payments);
                const total = entry.principalPayment + entry.interestPayment;
                const pRatio = (entry.principalPayment / total) * 100;

                return (
                  <tr key={entry.period} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5 text-sm font-bold text-slate-400 group-hover:text-slate-900">{entry.period}</td>
                    <td className="px-4 py-5 text-sm font-bold text-slate-900">{entry.dueDate}</td>
                    <td className="px-4 py-5 w-32">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500" style={{ width: `${pRatio}%` }} title="Principal" />
                        <div className="h-full bg-slate-200" style={{ width: `${100 - pRatio}%` }} title="Interest" />
                      </div>
                    </td>
                    <td className="px-4 py-5 text-sm font-black text-slate-900 text-right">{formatCurrency(total, loan.currency)}</td>
                    <td className="px-4 py-5 text-sm font-medium text-slate-500 text-right tabular-nums">{formatCurrency(entry.remainingBalance, loan.currency)}</td>
                    <td className="px-8 py-5 text-center">
                      <PaymentStatusChip
                        loanId={loan.id}
                        dueDate={entry.dueDate}
                        amount={total}
                        initialStatus={status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
           {schedule.entries.map(entry => {
             const status = getPaymentStatus(entry.dueDate, payments);
             return (
               <div key={entry.period} className="p-6">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <p className="text-xs font-bold text-slate-400 uppercase mb-0.5">Payment #{entry.period}</p>
                     <p className="text-sm font-black text-slate-900">{entry.dueDate}</p>
                   </div>
                   <PaymentStatusChip
                      loanId={loan.id}
                      dueDate={entry.dueDate}
                      amount={entry.principalPayment + entry.interestPayment}
                      initialStatus={status}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment</p>
                     <p className="text-base font-black text-slate-900">{formatCurrency(entry.principalPayment + entry.interestPayment, loan.currency)}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Balance</p>
                     <p className="text-base font-medium text-slate-500">{formatCurrency(entry.remainingBalance, loan.currency)}</p>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
}

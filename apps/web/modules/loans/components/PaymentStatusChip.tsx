'use client';

import { useState, useTransition } from 'react';
import { togglePaymentStatus } from '~/app/dashboard/loans/actions';
import { CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react';

type PaymentStatus = 'paid' | 'overdue' | 'upcoming';

type PaymentStatusChipProps = Readonly<{
  loanId: string;
  dueDate: string;
  amount: number;
  initialStatus: PaymentStatus;
}>;

export function PaymentStatusChip({ loanId, dueDate, amount, initialStatus }: PaymentStatusChipProps) {
  const [isPending, startTransition] = useTransition();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const isPaid = initialStatus === 'paid';

  const handleAction = () => {
    if (isPaid) {
      // Unmarking as paid
      startTransition(async () => {
        try {
          await togglePaymentStatus(loanId, dueDate, amount, false);
        } catch (err) {
          console.error('Failed to unmark payment:', err);
        }
      });
    } else {
      // Show date picker to confirm paid date
      setShowDatePicker(true);
    }
  };

  const confirmPaid = () => {
    startTransition(async () => {
      try {
        await togglePaymentStatus(loanId, dueDate, amount, true, selectedDate);
        setShowDatePicker(false);
      } catch (err) {
        console.error('Failed to mark payment as paid:', err);
      }
    });
  };

  if (showDatePicker) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white shadow-sm"
        />
        <button
          onClick={confirmPaid}
          disabled={isPending}
          className="h-8 px-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => setShowDatePicker(false)}
          className="h-8 px-3 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-200"
        >
          Esc
        </button>
      </div>
    );
  }

  const configs: Record<PaymentStatus, { label: string; icon: any; color: string; bg: string; border: string }> = {
    paid: {
      label: 'Paid',
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    overdue: {
      label: 'Overdue',
      icon: AlertCircle,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-100'
    },
    upcoming: {
      label: 'Mark Paid',
      icon: Clock,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    }
  };

  const config = configs[initialStatus];
  const Icon = config.icon;

  return (
    <button
      onClick={handleAction}
      disabled={isPending}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
        ${config.bg} ${config.color} ${config.border}
        hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isPending ? 'animate-pulse' : ''}
      `}
    >
      <Icon size={12} strokeWidth={3} />
      {config.label}
    </button>
  );
}

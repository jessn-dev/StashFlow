'use client';

import { useState, useTransition } from 'react';
import { togglePaymentStatus } from '~/app/dashboard/loans/actions';

type PaymentCheckboxProps = Readonly<{
  loanId: string;
  dueDate: string;
  amount: number;
  initialStatus: 'paid' | 'overdue' | 'pending';
}>;

export function PaymentCheckbox({ loanId, dueDate, amount, initialStatus }: PaymentCheckboxProps) {
  const [isPending, startTransition] = useTransition();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const isPaid = initialStatus === 'paid';

  const handleToggle = () => {
    if (isPaid) {
      // Unmarking as paid
      startTransition(async () => {
        try {
          await togglePaymentStatus(loanId, dueDate, amount, false);
        } catch (err) {
          console.error('Failed to unmark payment:', err);
          alert('Failed to update payment status.');
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
        alert('Failed to update payment status.');
      }
    });
  };

  if (showDatePicker) {
    return (
      <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-200">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-[10px] px-1.5 py-1 border border-gray-200 rounded-md outline-none focus:border-blue-400 transition-colors"
        />
        <div className="flex gap-1">
          <button
            onClick={confirmPaid}
            disabled={isPending}
            className="text-[9px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? '...' : 'Save'}
          </button>
          <button
            onClick={() => setShowDatePicker(false)}
            disabled={isPending}
            className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className={`relative flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all hover:bg-gray-50 group ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={isPaid}
        disabled={isPending}
        onChange={handleToggle}
        className="sr-only"
      />
      <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${
        isPaid 
          ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-100' 
          : 'border-gray-200 bg-white group-hover:border-gray-300'
      }`}>
        {isPaid && <span className="text-white text-[10px] font-black">✓</span>}
      </div>
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </label>
  );
}

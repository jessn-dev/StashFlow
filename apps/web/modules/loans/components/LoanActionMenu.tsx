'use client';

import { useState, useTransition } from 'react';
import { deleteLoan, markLoanAsPaid } from '~/app/dashboard/loans/actions';

type LoanActionMenuProps = Readonly<{
  loanId: string;
  currentStatus: string;
}>;

export function LoanActionMenu({ loanId, currentStatus }: LoanActionMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmPaid, setShowConfirmPaid] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [completionDate, setCompletionDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
      startTransition(async () => {
        try {
          await deleteLoan(loanId);
        } catch (err) {
          console.error('Failed to delete loan:', err);
          alert('Failed to delete loan.');
        }
      });
    }
  };

  const handleMarkPaid = () => {
    startTransition(async () => {
      try {
        await markLoanAsPaid(loanId, completionDate);
        setShowConfirmPaid(false);
      } catch (err) {
        console.error('Failed to mark loan as paid:', err);
        alert('Failed to update loan status.');
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {currentStatus !== 'completed' && (
        <button
          onClick={() => setShowConfirmPaid(true)}
          disabled={isPending}
          className="text-xs font-bold px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50"
        >
          Mark as Paid
        </button>
      )}
      <button
        onClick={() => setShowConfirmDelete(true)}
        disabled={isPending}
        className="text-xs font-bold px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        Delete Loan
      </button>

      {/* Mark as Paid Confirmation Dialog */}
      {showConfirmPaid && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-gray-100 animate-in zoom-in duration-300">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Loan?</h3>
            <p className="text-sm text-gray-500 mb-6">Confirm the date this loan was fully paid off.</p>
            
            <div className="mb-8">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Paid Date</label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleMarkPaid}
                disabled={isPending}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {isPending ? 'Updating...' : 'Confirm Paid'}
              </button>
              <button
                onClick={() => setShowConfirmPaid(false)}
                disabled={isPending}
                className="w-full py-3 bg-white text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-gray-100 animate-in zoom-in duration-300">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Loan?</h3>
            <p className="text-sm text-gray-500 mb-8">This will permanently remove this loan and all its payment history. This action is irreversible.</p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await deleteLoan(loanId);
                    } catch (err) {
                      console.error('Failed to delete loan:', err);
                      alert('Failed to delete loan.');
                      setShowConfirmDelete(false);
                    }
                  });
                }}
                disabled={isPending}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100 disabled:opacity-50"
              >
                {isPending ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isPending}
                className="w-full py-3 bg-white text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep Loan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

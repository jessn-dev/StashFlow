'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TransactionForm } from './TransactionForm';
import type { UnifiedTransaction } from '@stashflow/core';

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: UnifiedTransaction;
}

export function TransactionDrawer({ open, onClose, initialData }: Props) {
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function handleSuccess() {
    router.refresh();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Transaction"
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{initialData ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TransactionForm onSuccess={handleSuccess} {...(initialData !== undefined ? { initialData } : {})} />
        </div>
      </div>
    </>
  );
}

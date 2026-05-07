'use client';

import { useEffect } from 'react';
import { GoalForm } from './GoalForm';
import type { Goal } from '@stashflow/core';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialData?: Goal;
}

export function GoalDrawer({ open, onClose, userId, initialData }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={initialData ? 'Edit Goal' : 'New Goal'}
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {initialData ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <GoalForm
            userId={userId}
            onSuccess={onClose}
            {...(initialData !== undefined ? { initialData } : {})}
          />
        </div>
      </div>
    </>
  );
}

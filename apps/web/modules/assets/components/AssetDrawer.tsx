'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AssetForm } from './AssetForm';
import type { Asset } from '@stashflow/core';

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: Asset;
}

export function AssetDrawer({ open, onClose, initialData }: Props) {
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
        className={`fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-black tracking-tight text-gray-900">{initialData ? 'Edit Asset' : 'Add Asset'}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-900 text-xl font-black leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AssetForm onSuccess={handleSuccess} initialData={initialData} />
        </div>
      </div>
    </>
  );
}

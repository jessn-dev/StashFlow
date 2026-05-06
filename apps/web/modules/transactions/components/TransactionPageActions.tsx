'use client';

import { useState } from 'react';
import { TransactionDrawer } from './TransactionDrawer';

export function TransactionPageActions() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          disabled
          title="Coming soon"
          className="px-4 py-2 text-sm font-semibold text-gray-400 border border-gray-200 rounded-xl cursor-not-allowed"
        >
          Import
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm hover:-translate-y-0.5 active:translate-y-0"
        >
          + Add Transaction
        </button>
      </div>

      <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionDrawer } from './TransactionDrawer';

/**
 * Action buttons for the Transactions page, including Import and Add Transaction functionality.
 * Manages the state of the transaction creation drawer.
 * 
 * @returns A rendered action bar with navigation and state-driven triggers.
 */
export function TransactionPageActions() {
  // Local state to control the visibility of the transaction creation overlay
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  // PSEUDOCODE:
  // 1. Render a container for action buttons.
  // 2. Button 1: Triggers navigation to the import module.
  // 3. Button 2: Toggles the 'drawerOpen' state to true.
  // 4. Render TransactionDrawer, passing the 'drawerOpen' state and a close handler.

  return (
    <>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/dashboard/transactions/import')}
          className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
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

      {/* 
          Using a drawer for creation provides a "modal" experience without losing 
          the context of the transaction list beneath it. 
      */}
      <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

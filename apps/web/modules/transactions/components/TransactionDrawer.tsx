'use client';

/**
 * @module TransactionDrawer
 * A sliding side panel that hosts the TransactionForm. 
 * Provides a context-preserving way to add or edit transactions without 
 * navigating away from the current page.
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TransactionForm } from './TransactionForm';
import type { UnifiedTransaction } from '@stashflow/core';

/** Properties for the TransactionDrawer component. */
interface Props {
  /** Controls the visibility of the drawer. */
  open: boolean;
  /** Callback function to close the drawer. */
  onClose: () => void;
  /** Optional transaction data for edit mode. If omitted, the drawer defaults to creation mode. */
  initialData?: UnifiedTransaction;
}

/**
 * Side-sliding drawer for transaction entry and editing.
 * 
 * @param {Props} props - Component props.
 * @returns {JSX.Element} The rendered drawer and backdrop.
 */
export function TransactionDrawer({ open, onClose, initialData }: Props) {
  const router = useRouter();

  /*
   * PSEUDOCODE: Accessibility & Keyboard Control
   * 1. Listen for keydown events when the drawer is open.
   * 2. Detect the 'Escape' key press.
   * 3. Invoke onClose() if Escape is detected to follow standard modal behavior.
   * 4. Return cleanup function to remove listener on unmount.
   */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /**
   * Refreshes the server-side data and closes the drawer after a successful save.
   */
  function handleSuccess() {
    // Refreshing the router ensures the underlying list/timeline reflects the 
    // changes immediately without a full page reload.
    router.refresh();
    onClose();
  }

  /*
   * PSEUDOCODE: Rendering Logic
   * 1. Render a fixed backdrop with a transition for smooth dimming.
   * 2. Render the panel with a horizontal translate animation based on 'open' state.
   * 3. Use aria-modal and role="dialog" for screen reader compatibility.
   * 4. Inject the TransactionForm into the scrollable body of the drawer.
   */
  return (
    <>
      {/* 
          Backdrop: 
          Clicking the backdrop acts as an intuitive "cancel" action for the user.
      */}
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

        {/* 
            Scrollable content: 
            The form can be long on smaller vertical screens, so we isolate scrolling here.
        */}
        <div className="flex-1 overflow-y-auto p-6">
          <TransactionForm onSuccess={handleSuccess} {...(initialData !== undefined ? { initialData } : {})} />
        </div>
      </div>
    </>
  );
}

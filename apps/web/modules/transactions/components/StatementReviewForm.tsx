'use client';

/**
 * @module StatementReviewForm
 * Provides a tabular interface for users to review, edit, and categorize 
 * transactions extracted from a bank statement. It handles the batch insertion
 * of both incomes and expenses into the ledger.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '~/lib/supabase/client';
import { formatCurrency, EXPENSE_CATEGORIES, CURRENCIES } from '@stashflow/core';
import type { ExpenseCategory } from '@stashflow/core';

/** Data structure for an individual transaction extracted by AI. */
export interface ExtractedTransaction {
  /** ISO date string for the transaction. */
  date: string;
  /** Raw description string from the statement. */
  description: string;
  /** Numerical amount (negative for expenses, positive for income). */
  amount: number;
  /** Suggested category based on AI classification. */
  category?: ExpenseCategory;
  /** Evidence from the PDF where this data was found. */
  provenance?: { page?: number; snippet?: string };
}

/** Properties for the StatementReviewForm component. */
interface Props {
  /** ID of the source document record. */
  docId: string;
  /** Array of transactions extracted from the document. */
  initialTransactions: ExtractedTransaction[];
  /** Name of the bank or account found in the statement. */
  accountName: string;
  /** The date range covered by the statement. */
  statementPeriod: string;
}

/**
 * Batch review and import form for bank statement transactions.
 * 
 * @param {Props} props - Component props.
 * @returns {JSX.Element} The rendered review table and action bar.
 */
export function StatementReviewForm({ docId, initialTransactions, accountName, statementPeriod }: Props) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [ignoredIndices, setIgnoredIndices] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // We compute active transactions on every render to ensure the "Confirm" 
  // button count accurately reflects user exclusions.
  const activeTransactions = transactions.filter((_, i) => !ignoredIndices.has(i));

  /**
   * Updates a specific transaction in the state array.
   * 
   * @param {number} index - The index of the transaction to update.
   * @param {Partial<ExtractedTransaction>} updates - The fields to merge.
   */
  const updateTx = (index: number, updates: Partial<ExtractedTransaction>) => {
    setTransactions(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  /**
   * Finalizes the import by splitting data into expenses/incomes and performing batch inserts.
   */
  const handleSave = async () => {
    /*
     * PSEUDOCODE:
     * 1. Filter out ignored items to respect user selections.
     * 2. Categorize items: negative amounts -> 'expenses', positive amounts -> 'incomes'.
     * 3. Map frontend transaction structure to backend table schemas (user_id, amount, provenance, etc).
     * 4. Perform batch insertion for expenses.
     * 5. Perform batch insertion for incomes.
     * 6. Mark the source document as 'success' to close the processing loop.
     * 7. Trigger success UI state.
     */
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSubmitting(false); return; }

    try {
      // Split and map expenses
      const expenses = activeTransactions
        .filter(t => t.amount < 0)
        .map(t => ({
          user_id: user.id,
          amount: Math.abs(t.amount),
          currency: 'PHP', // Defaulting to local currency until multi-currency support is finalized.
          description: t.description,
          date: t.date,
          category: t.category || 'other',
          notes: `Imported from ${accountName} (${statementPeriod})`,
          provenance: t.provenance || null,
          source_document_id: docId,
        }));

      // Split and map incomes
      const incomes = activeTransactions
        .filter(t => t.amount > 0)
        .map(t => ({
          user_id: user.id,
          amount: t.amount,
          currency: 'PHP',
          source: t.description,
          date: t.date,
          notes: `Imported from ${accountName} (${statementPeriod})`,
          provenance: t.provenance || null,
          source_document_id: docId,
        }));

      // Execute batch operations in parallel to optimize import speed.
      if (expenses.length > 0) {
        const { error: exErr } = await supabase.from('expenses').insert(expenses);
        if (exErr) throw exErr;
      }

      if (incomes.length > 0) {
        const { error: inErr } = await supabase.from('incomes').insert(incomes);
        if (inErr) throw inErr;
      }

      // Update document status to signal the end of the extraction-review lifecycle.
      await supabase.from('documents').update({
        processing_status: 'success',
      }).eq('id', docId);

      setIsSaved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save transactions');
    } finally {
      setSubmitting(false);
    }
  };

  if (isSaved) {
    return (
      <div className="py-12 px-6 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 mb-10 animate-in fade-in zoom-in duration-500">
         <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-4 shadow-lg shadow-emerald-100">✓</div>
         <h3 className="text-lg font-bold text-emerald-900">Transactions Imported</h3>
         <p className="text-sm text-emerald-700 mt-1 mb-6">{activeTransactions.length} items added to your timeline.</p>
         <div className="flex gap-4 justify-center">
            <Link 
              href="/dashboard/transactions"
              className="px-4 py-2 bg-white border border-emerald-200 rounded-lg text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              View Timeline
            </Link>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Institution header provides context for the statement being reviewed */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institution</p>
          <p className="text-sm font-semibold text-gray-900">{accountName}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period</p>
          <p className="text-sm font-semibold text-gray-900">{statementPeriod}</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map((t, i) => {
              const ignored = ignoredIndices.has(i);
              return (
                <tr key={i} className={`group transition-opacity ${ignored ? 'opacity-30' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="date" 
                      value={t.date} 
                      disabled={ignored}
                      onChange={e => updateTx(i, { date: e.target.value })}
                      className="bg-transparent text-sm font-medium text-gray-600 outline-none focus:text-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative group/snippet">
                      <input 
                        value={t.description} 
                        disabled={ignored}
                        onChange={e => updateTx(i, { description: e.target.value })}
                        className="bg-transparent text-sm font-bold text-gray-900 outline-none w-full"
                      />
                      {/* Hovering over a description shows the AI source snippet for verification */}
                      {t.provenance?.snippet && (
                        <div className="absolute left-0 top-full mt-1 opacity-0 group-hover/snippet:opacity-100 transition-opacity z-10 pointer-events-none">
                           <div className="bg-[#0A2540] text-white p-2 rounded-lg text-[10px] shadow-xl border border-white/10 whitespace-nowrap">
                             “{t.provenance.snippet}” (Page {t.provenance.page})
                           </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={t.category || 'other'}
                      disabled={ignored}
                      onChange={e => updateTx(i, { category: e.target.value as ExpenseCategory })}
                      className="bg-transparent text-xs font-bold text-gray-400 uppercase tracking-widest outline-none cursor-pointer hover:text-gray-600"
                    >
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black tabular-nums ${t.amount < 0 ? 'text-gray-900' : 'text-emerald-600'}`}>
                      {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount, 'PHP')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* The ignore button allows users to skip irrelevant lines like bank fees or internal transfers */}
                    <button
                      onClick={() => {
                        const next = new Set(ignoredIndices);
                        if (ignored) next.delete(i); else next.add(i);
                        setIgnoredIndices(next);
                      }}
                      className="text-gray-300 hover:text-rose-500 transition-colors"
                    >
                      {ignored ? '↺' : '✕'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => router.push('/dashboard/transactions')}
          className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel Import
        </button>
        <button
          onClick={handleSave}
          disabled={submitting || activeTransactions.length === 0}
          className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-sm shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          {submitting ? 'Importing…' : `Confirm & Import ${activeTransactions.length} Items`}
        </button>
      </div>
    </div>
  );
}

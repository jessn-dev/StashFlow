'use client';

import { useState } from 'react';
import { UnifiedTransaction, formatCurrency } from '@stashflow/core';
import Link from 'next/link';

/**
 * Renders a list of transactions with filtering capabilities.
 * 
 * @param props - Component properties.
 * @param props.transactions - Array of unified transaction objects to display.
 * @returns A rendered list of transactions with type-based filters.
 */
export function TransactionList({ 
  transactions 
}: Readonly<{ 
  transactions: UnifiedTransaction[];
}>) {
  // Local filter state for immediate UI responsiveness without full page reload
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  // PSEUDOCODE:
  // 1. Take the full transactions array from props.
  // 2. Apply a filter based on the local 'filter' state:
  //    - If 'all', include every transaction.
  //    - If 'income' or 'expense', include only transactions matching that type.
  // 3. Store results in 'filtered' variable for rendering.

  const filtered = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with Type Selector */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Transactions</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           {(['all', 'income', 'expense'] as const).map((f) => (
             <button
               key={f}
               onClick={() => setFilter(f)}
               className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                 filter === f 
                   ? 'bg-white text-gray-900 shadow-sm' 
                   : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {filtered.length === 0 ? (
          /* Empty State Handling */
          <div className="p-16 text-center">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="text-2xl">💸</span>
             </div>
             <h3 className="text-lg font-bold text-gray-900">No transactions found</h3>
             <p className="text-sm text-gray-400 max-w-xs mx-auto mt-2 mb-8">
               {filter === 'all' 
                 ? "You haven't recorded any financial activity yet. Start tracking to see your money flow."
                 : `No ${filter} found in your records.`}
             </p>
             {filter === 'all' && (
               <Link 
                 href="/dashboard/transactions/new"
                 className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
               >
                 Add Your First Transaction
               </Link>
             )}
          </div>
        ) : (
          /* Transaction Rows */
          filtered.map((t) => (
            <div key={t.id} className="px-6 py-5 flex justify-between items-center hover:bg-gray-50/50 transition-colors group">
              <div className="flex items-center gap-5">
                {/* Visual indicator for transaction type */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-105 ${
                  t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {t.type === 'income' ? '↓' : '↑'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{t.description}</p>
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-0.5">
                    {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {t.category && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="capitalize">{t.category}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {/* Amount display with semantic coloring */}
                <p className={`text-lg font-black tracking-tight ${
                  t.type === 'income' ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                </p>
                {t.notes && (
                  <p className="text-[10px] text-gray-400 mt-0.5 max-w-[150px] truncate">{t.notes}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

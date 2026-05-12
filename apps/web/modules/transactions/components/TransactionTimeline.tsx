'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UnifiedTransaction, formatCurrency, convertToBase } from '@stashflow/core';
import { TransactionQuery } from '@stashflow/api';
import { createClient } from '~/lib/supabase/client';
import { TransactionDrawer } from './TransactionDrawer';

/**
 * Represents a chronological group of transactions.
 */
interface Group {
  /** The human-readable timeframe label (e.g., "Today", "Older"). */
  label: string;
  /** The list of transactions belonging to this timeframe. */
  transactions: UnifiedTransaction[];
}

/**
 * Groups a flat list of transactions into relative date buckets for timeline display.
 * 
 * @param transactions - List of transactions to group.
 * @returns An array of Group objects containing a label and its transactions.
 */
function groupByDate(transactions: UnifiedTransaction[]): Group[] {
  // PSEUDOCODE: Date Grouping Logic
  // 1. Define anchor points: Today, Yesterday, Start of Week, Start of Month.
  // 2. Iterate through transactions and assign each to the most specific matching bucket.
  // 3. Return non-empty buckets as labeled Groups.

  const today = new Date().toISOString().split('T')[0]!;
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0]!;
  })();
  const weekAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0]!;
  })();
  const monthStart = today.slice(0, 7) + '-01';

  const LABELS = ['Today', 'Yesterday', 'Earlier This Week', 'Earlier This Month', 'Older'] as const;
  const buckets = new Map<string, UnifiedTransaction[]>(LABELS.map((l) => [l, []]));

  for (const t of transactions) {
    if (t.date >= today) buckets.get('Today')!.push(t);
    else if (t.date >= yesterday) buckets.get('Yesterday')!.push(t);
    else if (t.date >= weekAgo) buckets.get('Earlier This Week')!.push(t);
    else if (t.date >= monthStart) buckets.get('Earlier This Month')!.push(t);
    else buckets.get('Older')!.push(t);
  }

  return LABELS.flatMap((label) => {
    const txns = buckets.get(label)!;
    return txns.length ? [{ label, transactions: txns }] : [];
  });
}

/**
 * Maps a transaction category or type to a descriptive emoji icon.
 */
function getCategoryIcon(type: 'income' | 'expense', category?: string | null): string {
  if (type === 'income') return '↓';
  if (!category) return '↑';
  const c = category.toLowerCase();
  if (c.includes('food') || c.includes('dining') || c.includes('restaurant') || c.includes('groceries')) return '🍽';
  if (c.includes('transport') || c.includes('travel') || c.includes('gas')) return '🚗';
  if (c.includes('utilities') || c.includes('electric') || c.includes('water') || c.includes('internet')) return '💡';
  if (c.includes('shopping') || c.includes('clothing')) return '🛍';
  if (c.includes('entertainment') || c.includes('subscriptions')) return '🎬';
  if (c.includes('healthcare') || c.includes('medical') || c.includes('health')) return '🏥';
  if (c.includes('education')) return '📚';
  if (c.includes('rent') || c.includes('housing')) return '🏠';
  return '↑';
}

/**
 * Simple key-value row for transaction details.
 */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 flex-1">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  );
}

/**
 * Component rendered when a transaction row is expanded to show full metadata.
 */
function TransactionExpansion({
  t,
  rates,
  baseCurrency,
  onEdit,
  onDelete,
}: {
  /** The transaction being expanded. */
  t: UnifiedTransaction;
  /** Currency conversion rates. */
  rates: Record<string, number>;
  /** The user's preferred base currency. */
  baseCurrency: string;
  /** Callback to trigger edit mode. */
  onEdit: () => void;
  /** Callback to trigger after deletion. */
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const showExchange = t.currency !== baseCurrency;
  const baseRate = rates[t.currency];
  const baseAmount = showExchange && baseRate != null ? convertToBase(t.amount, baseRate) : null;

  /**
   * Performs the hard-delete of the transaction from the database.
   */
  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const table = t.type === 'income' ? 'incomes' : 'expenses';
    // We target the specific record by ID and table type
    await supabase.from(table).delete().eq('id', t.id);
    router.refresh();
    onDelete();
  }

  return (
    <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 space-y-4">
      {/* Core details */}
      <div className="space-y-2.5">
        <DetailRow label="Description" value={t.description} />
        <DetailRow
          label="Date"
          value={new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
          })}
        />
        {t.type === 'expense' && (
          <DetailRow
            label="Category"
            value={t.category ? String(t.category).replace(/_/g, ' ') : null}
          />
        )}
        <DetailRow label="Notes" value={t.notes ?? null} />
      </div>

      {/* Exchange metadata - Only shown if the transaction is in a foreign currency */}
      {showExchange && baseAmount !== null && baseRate != null && (
        <div className="pt-2 border-t border-gray-200 space-y-2.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Exchange</p>
          <DetailRow label="Original" value={formatCurrency(t.amount, t.currency)} />
          <DetailRow
            label="Rate"
            value={`1 ${t.currency} = ${baseRate.toFixed(4)} ${baseCurrency}`}
          />
          <DetailRow label="Converted" value={`≈ ${formatCurrency(baseAmount, baseCurrency)}`} />
        </div>
      )}

      {/* Intelligence metadata - Displays the origin of the transaction entry */}
      <div className="pt-2 border-t border-gray-200 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intelligence</p>
        <DetailRow 
           label="Source" 
           value={t.source_document_id ? <span className="text-blue-600 font-medium">📄 Document Import</span> : <span className="text-gray-400">Manual entry</span>} 
        />
        <DetailRow label="Recurring" value={<span className="text-gray-300 text-xs">—</span>} />
      </div>

      {/* Provenance Evidence - Shown if the record was extracted from a document via AI */}
      {t.provenance && (
        <div className="pt-2 border-t border-gray-200 space-y-2.5">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Evidence</p>
           <div className="bg-[#0A2540] text-white p-3 rounded-xl shadow-inner border border-white/5">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-300">Verified Extract</span>
                 {t.provenance.page && (
                   <span className="bg-blue-500/20 px-1.5 py-0.5 rounded text-[10px] text-blue-200 font-bold">Page {t.provenance.page}</span>
                 )}
              </div>
              <p className="text-xs italic text-gray-300 leading-relaxed">“{t.provenance.snippet}”</p>
           </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onEdit}
          className="px-4 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-white transition-colors"
        >
          Edit
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A single row in the transaction list. Handles expansion toggles and 
 * basic information display.
 */
function TransactionRow({
  t,
  rates,
  baseCurrency,
  expanded,
  onToggle,
  onEdit,
  onDeleted,
}: {
  t: UnifiedTransaction;
  rates: Record<string, number>;
  baseCurrency: string;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const showBase = t.currency !== baseCurrency;
  const baseRate = rates[t.currency];
  const baseAmount = showBase && baseRate != null ? convertToBase(t.amount, baseRate) : null;

  return (
    <div>
      <div
        onClick={onToggle}
        className={`flex items-center gap-4 px-6 py-4 transition-colors cursor-pointer group ${
          expanded ? 'bg-gray-50/80' : 'hover:bg-gray-50/60'
        }`}
        style={{ minHeight: '68px' }}
      >
        {/* Icon with semantic coloring */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-transform group-hover:scale-105 ${
            t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className="text-sm leading-none">{getCategoryIcon(t.type, t.category)}</span>
        </div>

        {/* Primary Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
            {/* Visual badges for provenance */}
            {t.source_document_id && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 border border-blue-100 flex-shrink-0">
                📄 Doc
              </span>
            )}
            {!t.source_document_id && t.provenance && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-500 border border-emerald-100 flex-shrink-0">
                ✨ AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-gray-400">
              {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {t.category && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                <span className="text-[11px] text-gray-400 capitalize">
                  {String(t.category).replace(/_/g, ' ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Financial values (Original + Converted if applicable) */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p
              className={`text-sm font-bold tabular-nums ${
                t.type === 'income' ? 'text-emerald-600' : 'text-gray-900'
              }`}
            >
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount, t.currency)}
            </p>
            {baseAmount !== null && (
              <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
                ≈ {formatCurrency(baseAmount, baseCurrency)}
              </p>
            )}
          </div>
          <span
            className={`text-gray-300 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </div>
      </div>

      {expanded && (
        <TransactionExpansion
          t={t}
          rates={rates}
          baseCurrency={baseCurrency}
          onEdit={onEdit}
          onDelete={onDeleted}
        />
      )}
    </div>
  );
}

/**
 * Component properties for the TransactionTimeline.
 */
interface Props {
  /** Initial set of transactions loaded on the server. */
  initialTransactions: UnifiedTransaction[];
  /** Latest currency exchange rates. */
  rates: Record<string, number>;
  /** The user's account base currency. */
  baseCurrency: string;
  /** Whether the current view is restricted by a search/filter. */
  isFiltered: boolean;
  /** The authenticated user's unique identifier. */
  userId: string;
  /** Active filter parameters for infinite scrolling. */
  filters: {
    dateFrom?: string;
    dateTo?: string;
    type?: 'all' | 'income' | 'expense';
    search?: string;
  };
}

/**
 * Main component for rendering the transaction history timeline with infinite scroll.
 */
export function TransactionTimeline({
  initialTransactions,
  rates,
  baseCurrency,
  isFiltered,
  userId,
  filters,
}: Props) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  // Track if more data is available on the server for infinite scroll
  const [hasMore, setHasMore] = useState(initialTransactions.length >= 100);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<UnifiedTransaction | null>(null);

  // Sync internal state when server props change (e.g., filter navigation)
  useEffect(() => {
    setTransactions(initialTransactions);
    setHasMore(initialTransactions.length >= 100);
  }, [initialTransactions]);

  /**
   * Fetches the next page of transactions based on the date and ID of the last item.
   * 
   * PSEUDOCODE: Infinite Scroll Pagination
   * 1. Extract cursor from the last transaction (Date | ID).
   * 2. Call TransactionQuery with current filters and cursor.
   * 3. Append results to existing transactions list.
   * 4. Disable further loading if fewer than 'limit' results are returned.
   */
  async function handleLoadMore() {
    // PSEUDOCODE:
    // 1. Prevent concurrent loads.
    // 2. Determine the cursor from the last transaction in the current list (date + id).
    // 3. Invoke the 'getTransactionsFiltered' query via the TransactionQuery API.
    // 4. If fewer than 50 results return, mark 'hasMore' as false.
    // 5. Append new transactions to the existing list.

    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const last = transactions.at(-1);
      const cursor = last ? `${last.date}|${last.id}` : undefined;

      const supabase = createClient();
      const query = new TransactionQuery(supabase);
      const more = await query.getTransactionsFiltered(userId, {
        ...filters,
        cursor,
        limit: 50,
      });

      if (more.length < 50) {
        setHasMore(false);
      }
      setTransactions((prev) => [...prev, ...more]);
    } catch (err) {
      console.error('Failed to load more transactions:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
          💸
        </div>
        {isFiltered ? (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No transactions match your filters.</h3>
            <p className="text-sm text-gray-400">Try adjusting the date range or search terms.</p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Import transactions to build your financial overview.
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-8">
              We&apos;ll organize activity, detect patterns, and generate insights automatically.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                disabled
                title="Coming soon"
                className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl opacity-50 cursor-not-allowed"
              >
                Upload Statement
              </button>
              <Link
                href="/dashboard/transactions/new"
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors border border-gray-200 rounded-xl"
              >
                Add Manually
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  // PSEUDOCODE:
  // 1. Group the active transactions into time buckets.
  // 2. Render each group as a header + a list of TransactionRow components.
  // 3. If 'hasMore' is true, show a pagination button at the bottom.
  // 4. Maintain a single 'TransactionDrawer' instance for editing to conserve memory.

  const groups = groupByDate(transactions);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {group.label}
              </span>
              <span className="text-[11px] text-gray-400">
                {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-gray-50/80">
              {group.transactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  t={t}
                  rates={rates}
                  baseCurrency={baseCurrency}
                  expanded={expandedId === t.id}
                  onToggle={() => handleToggle(t.id)}
                  onEdit={() => { setEditTarget(t); setExpandedId(null); }}
                  onDeleted={() => setExpandedId(null)}
                />
              ))}
            </div>
          </div>
        ))}

        {hasMore && (
          <div className="p-6 border-t border-gray-100 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Transactions'
              )}
            </button>
          </div>
        )}
      </div>

      <TransactionDrawer
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        {...(editTarget !== null ? { initialData: editTarget } : {})}
      />
    </>
  );
}

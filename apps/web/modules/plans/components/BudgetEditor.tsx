'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '~/lib/supabase/client';
import { BudgetQuery } from '@stashflow/api';
import { CURRENCIES, EXPENSE_CATEGORIES, formatCurrency } from '@stashflow/core';
import type { Budget, BudgetPeriod, ExpenseCategory } from '@stashflow/core';

interface Props {
  userId: string;
  budgets: Budget[];
  periodMap: Map<string, BudgetPeriod>;
  defaultCurrency?: string;
  onClose?: () => void;
}

const CATEGORY_LABELS: Partial<Record<ExpenseCategory, string>> = {
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  utilities: 'Utilities',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  education: 'Education',
  personal: 'Personal',
  shopping: 'Shopping',
  other: 'Other',
};

export function BudgetEditor({ userId, budgets, periodMap, defaultCurrency = 'USD', onClose }: Props) {
  const router = useRouter();

  const budgetMap = new Map(budgets.map((b) => [b.category, b]));

  const [amounts, setAmounts] = useState<Partial<Record<ExpenseCategory, string>>>(() => {
    const init: Partial<Record<ExpenseCategory, string>> = {};
    for (const cat of EXPENSE_CATEGORIES) {
      const existing = budgetMap.get(cat);
      if (existing) init[cat] = String(Number(existing.amount));
    }
    return init;
  });

  const [currency, setCurrency] = useState(
    budgets[0]?.currency ?? defaultCurrency,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const query = new BudgetQuery(supabase);

      const upserts = EXPENSE_CATEGORIES
        .filter((cat) => {
          const val = amounts[cat];
          return val !== undefined && val.trim() !== '' && parseFloat(val) > 0;
        })
        .map((cat) =>
          query.upsert(userId, cat, parseFloat(amounts[cat]!), currency),
        );

      await Promise.all(upserts);
      router.refresh();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budgets');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {EXPENSE_CATEGORIES.map((cat) => {
          const period = periodMap.get(cat);
          const spent = period ? Number(period.spent) : 0;
          const budgetAmt = parseFloat(amounts[cat] ?? '') || 0;
          const pct = budgetAmt > 0 ? Math.min(100, Math.round((spent / budgetAmt) * 100)) : 0;
          const isOver = budgetAmt > 0 && spent > budgetAmt;

          return (
            <div key={cat} className="py-3 flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 w-28 flex-shrink-0">
                {CATEGORY_LABELS[cat] ?? cat}
              </span>

              <div className="flex-1 min-w-0">
                {budgetAmt > 0 && (
                  <div className="mb-1.5">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                      {formatCurrency(spent, currency)} spent
                    </p>
                  </div>
                )}
              </div>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amounts[cat] ?? ''}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [cat]: e.target.value }))}
                placeholder="0.00"
                className="w-28 px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
              />
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving…' : 'Save Budgets'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

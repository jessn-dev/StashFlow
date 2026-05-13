'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '~/lib/supabase/client';
import { GoalQuery } from '@stashflow/api';
import { formatCurrency } from '@stashflow/core';
import { GoalDrawer } from './GoalDrawer';
import type { Goal } from '@stashflow/core';

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

const TYPE_LABEL: Record<string, string> = {
  savings: 'Savings',
  debt: 'Debt reduction',
};

const TYPE_COLOR: Record<string, string> = {
  savings: 'bg-emerald-500',
  debt: 'bg-blue-500',
};

const TYPE_BADGE: Record<string, string> = {
  savings: 'bg-emerald-50 text-emerald-700',
  debt: 'bg-blue-50 text-blue-700',
};

type Props = Readonly<{
  goal: Goal;
  userId: string;
}>;

export function GoalCard({ goal, userId }: Props) {
  const router = useRouter();
  const pct = progressPercent(Number(goal.current_amount), Number(goal.target_amount));
  const days = daysUntil(goal.deadline ?? null);
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const supabase = createClient();
      const query = new GoalQuery(supabase);
      await query.delete(goal.id);
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-hidden" style={{ padding: '20px' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{goal.name}</p>
            {goal.deadline && (
              <p className="text-xs text-gray-400 mt-0.5">
                {days !== null && days >= 0
                  ? `${days === 0 ? 'Today' : `${days}d left`}`
                  : 'Deadline passed'}
              </p>
            )}
          </div>
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${TYPE_BADGE[goal.type] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {TYPE_LABEL[goal.type] ?? goal.type}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-gray-400">Progress</span>
            <span className="text-[11px] font-bold text-gray-700 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${TYPE_COLOR[goal.type] ?? 'bg-gray-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-gray-400">Saved</p>
            <p className="text-sm font-bold text-gray-900 tabular-nums">
              {formatCurrency(Number(goal.current_amount), goal.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400">Remaining</p>
            <p className="text-sm font-bold text-gray-500 tabular-nums">
              {remaining > 0 ? formatCurrency(remaining, goal.currency) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400">Target</p>
            <p className="text-sm font-bold text-gray-900 tabular-nums">
              {formatCurrency(Number(goal.target_amount), goal.currency)}
            </p>
          </div>
        </div>

        {/* Actions */}
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-600 font-semibold flex-1">Delete this goal?</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? '…' : 'Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <GoalDrawer
        open={editing}
        onClose={() => setEditing(false)}
        userId={userId}
        initialData={goal}
      />
    </>
  );
}

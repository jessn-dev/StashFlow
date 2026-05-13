'use client';

import { useState } from 'react';
import { GoalCard } from './GoalCard';
import { GoalDrawer } from './GoalDrawer';
import { BudgetCategoryRow } from './BudgetCategoryRow';
import { BudgetEditor } from './BudgetEditor';
import type { Goal, Budget, BudgetPeriod } from '@stashflow/core';

type Props = Readonly<{
  userId: string;
  goals: Goal[];
  budgets: Budget[];
  budgetPeriods: BudgetPeriod[];
  currentPeriod: string;
  defaultCurrency?: string;
}>;

export function PlansClient({ userId, goals, budgets, budgetPeriods, currentPeriod, defaultCurrency }: Props) {
  const periodMap = new Map<string, BudgetPeriod>(budgetPeriods.map((p) => [p.category, p]));
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [editingBudgets, setEditingBudgets] = useState(false);

  const isEmpty = goals.length === 0 && budgets.length === 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-bold tracking-tight text-gray-900 leading-none"
            style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.1' }}
          >
            Plans
          </h1>
          <p className="text-[15px] text-gray-400 font-medium mt-2" style={{ lineHeight: '1.5' }}>
            Goals, budgets, and spending controls in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setNewGoalOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            + New Goal
          </button>
          <button
            onClick={() => setEditingBudgets(true)}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Edit Budgets
          </button>
        </div>
      </div>

      {isEmpty && !editingBudgets ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">No plans yet</p>
          <p className="text-sm text-gray-400 max-w-xs mb-6">
            Create a savings goal or spending budget to start tracking intentional financial behavior.
          </p>
          <button
            onClick={() => setNewGoalOpen(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {editingBudgets ? (
            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Edit Monthly Budgets
              </p>
              <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-5">
                <BudgetEditor
                  userId={userId}
                  budgets={budgets}
                  periodMap={periodMap}
                  {...(defaultCurrency !== undefined ? { defaultCurrency } : {})}
                  onClose={() => setEditingBudgets(false)}
                />
              </div>
            </section>
          ) : (
            <>
              {goals.length > 0 && (
                <section>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Goals — {goals.length}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {goals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} userId={userId} />
                    ))}
                  </div>
                </section>
              )}

              {budgets.length > 0 && (
                <section>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Monthly Budgets — {currentPeriod}
                  </p>
                  <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
                    <div className="px-5 py-4">
                      {budgets.map((budget) => (
                        <BudgetCategoryRow
                          key={budget.id}
                          budget={budget}
                          period={periodMap.get(budget.category) ?? undefined}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      <GoalDrawer
        open={newGoalOpen}
        onClose={() => setNewGoalOpen(false)}
        userId={userId}
      />
    </>
  );
}

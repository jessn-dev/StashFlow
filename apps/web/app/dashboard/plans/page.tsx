import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoalQuery, BudgetQuery } from '@stashflow/api';
import { GoalCard, BudgetCategoryRow } from '@/modules/plans';
import type { BudgetPeriod } from '@stashflow/core';

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date().toISOString().split('T')[0]!;
  const currentPeriod = today.slice(0, 7);

  const goalQuery = new GoalQuery(supabase);
  const budgetQuery = new BudgetQuery(supabase);

  const [goals, budgets, budgetPeriods] = await Promise.all([
    goalQuery.getAll(user.id),
    budgetQuery.getActive(user.id),
    budgetQuery.getPeriods(user.id, currentPeriod),
  ]);

  const periodMap = new Map<string, BudgetPeriod>(
    budgetPeriods.map((p) => [p.category, p]),
  );

  const isEmpty = goals.length === 0 && budgets.length === 0;

  return (
    <div className="space-y-8">
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
            disabled
            title="Coming soon"
            className="px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-200 rounded-xl cursor-not-allowed"
          >
            New Plan
          </button>
        </div>
      </div>

      {isEmpty ? (
        /* Empty state */
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
            disabled
            title="Coming soon"
            className="px-5 py-2.5 text-sm font-semibold text-gray-300 border border-gray-200 rounded-xl cursor-not-allowed"
          >
            Create your first plan
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Goals section */}
          {goals.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Goals — {goals.length}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          )}

          {/* Budgets section */}
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
        </div>
      )}
    </div>
  );
}

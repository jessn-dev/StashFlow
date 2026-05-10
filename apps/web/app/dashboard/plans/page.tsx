import { redirect } from 'next/navigation';
import { createClient } from '~/lib/supabase/server';
import { GoalQuery, BudgetQuery } from '@stashflow/api';
import { PlansClient } from '~/modules/plans';

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

  return (
    <div className="space-y-8">
      <PlansClient
        userId={user.id}
        goals={goals}
        budgets={budgets}
        budgetPeriods={budgetPeriods}
        currentPeriod={currentPeriod}
      />
    </div>
  );
}

import { formatCurrency } from '@stashflow/core';
import type { Budget, BudgetPeriod } from '@stashflow/core';

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  utilities: 'Utilities',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  clothing: 'Clothing',
  education: 'Education',
  savings: 'Savings',
  other: 'Other',
};

type Props = Readonly<{
  budget: Budget;
  period: BudgetPeriod | undefined;
}>;

export function BudgetCategoryRow({ budget, period }: Props) {
  const budgeted = period ? Number(period.budgeted) : Number(budget.amount);
  const spent = period ? Number(period.spent) : 0;
  const pct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0;
  const over = spent > budgeted;

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">
          {CATEGORY_LABELS[budget.category] ?? budget.category}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold tabular-nums ${over ? 'text-red-500' : 'text-gray-500'}`}>
            {formatCurrency(spent, budget.currency)}
          </span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400 tabular-nums">
            {formatCurrency(budgeted, budget.currency)}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-gray-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

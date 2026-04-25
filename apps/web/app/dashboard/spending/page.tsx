import { createClient } from '@/lib/supabase/server';
import { TransactionQuery } from '@stashflow/api';
import { TransactionList } from '@/modules/transactions/components/TransactionList';

export default async function SpendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const transactionQuery = new TransactionQuery(supabase);
  const expenses = await transactionQuery.getExpenses(user.id);

  // Map to common Transaction interface
  const formattedExpenses = expenses.map(exp => ({
    id: exp.id,
    date: exp.date,
    amount: exp.amount,
    currency: exp.currency,
    description: exp.description,
    category: exp.category,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Spending & Expenses</h2>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
          Add Expense
        </button>
      </div>
      <TransactionList transactions={formattedExpenses} title="Recent Expenses" />
    </div>
  );
}

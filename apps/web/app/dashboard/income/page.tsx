import { createClient } from '@/lib/supabase/server';
import { TransactionQuery } from '@stashflow/api';
import { TransactionList } from '@/modules/transactions/components/TransactionList';

export default async function IncomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const transactionQuery = new TransactionQuery(supabase);
  const incomes = await transactionQuery.getIncomes(user.id);

  // Map to common Transaction interface
  const formattedIncomes = incomes.map(inc => ({
    id: inc.id,
    date: inc.date,
    amount: inc.amount,
    currency: inc.currency,
    description: inc.source,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Income Management</h2>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
          Add Income
        </button>
      </div>
      <TransactionList transactions={formattedIncomes} title="Recent Income" />
    </div>
  );
}

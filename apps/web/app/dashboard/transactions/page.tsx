import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TransactionQuery, ExchangeRateQuery } from '@stashflow/api';
import { TransactionSummaryStrip } from '@/modules/transactions/components/TransactionSummaryStrip';
import { TransactionFiltersBar } from '@/modules/transactions/components/TransactionFiltersBar';
import { TransactionTimeline } from '@/modules/transactions/components/TransactionTimeline';
import { TransactionPageActions } from '@/modules/transactions/components/TransactionPageActions';

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    type?: string;
    q?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
  const { from, to, type, q } = await searchParams;

  const today = new Date().toISOString().split('T')[0]!;
  const monthStart = today.slice(0, 7) + '-01';

  const dateFrom = from ?? monthStart;
  const dateTo = to ?? today;
  const txType = type === 'income' || type === 'expense' ? type : 'all';
  const search = q ?? '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const transactionQuery = new TransactionQuery(supabase);
  const rateQuery = new ExchangeRateQuery(supabase);

  const [transactions, summary, rates] = await Promise.all([
    transactionQuery.getTransactionsFiltered(user.id, {
      dateFrom,
      dateTo,
      type: txType,
      search,
    }),
    transactionQuery.getSummaryForPeriod(user.id, dateFrom, dateTo),
    rateQuery.getLatest(),
  ]);

  const isFiltered = !!search || txType !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Transactions</h1>
          <p className="text-gray-400 font-medium mt-1">
            All financial activity across your accounts.
          </p>
        </div>
        <TransactionPageActions />
      </div>

      {/* Filters */}
      <TransactionFiltersBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        type={txType}
        search={search}
      />

      {/* Summary strip */}
      <TransactionSummaryStrip
        summary={summary}
        filteredCount={transactions.length}
      />

      {/* Timeline */}
      <TransactionTimeline
        transactions={transactions}
        rates={rates}
        baseCurrency={summary.currency}
        isFiltered={isFiltered}
      />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { LoanQuery, ExchangeRateQuery, TransactionQuery } from '@stashflow/api';
import { aggregateLoanFinancials, convertToBase, getRegionByCurrency } from '@stashflow/core';
import { DtiSimulator } from '@/modules/dashboard/components/DtiSimulator';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function DtiSimulatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const loanQuery = new LoanQuery(supabase);
  const exchangeRateQuery = new ExchangeRateQuery(supabase);
  const transactionQuery = new TransactionQuery(supabase);

  const [loans, rates, incomes, { data: profile }] = await Promise.all([
    loanQuery.getAll(user.id),
    exchangeRateQuery.getLatest(),
    transactionQuery.getIncomes(user.id),
    supabase.from('profiles').select('preferred_currency').eq('id', user.id).single(),
  ]);

  const currency = profile?.preferred_currency || 'USD';
  const region = getRegionByCurrency(currency);

  const { totalMonthlyInstallment } = aggregateLoanFinancials(loans, rates);

  const monthlyIncome = incomes.reduce((acc, inc) => {
    const rate = rates[inc.currency] ?? 1;
    return acc + convertToBase(inc.amount, rate);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-900 transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">DTI Simulator</h1>
          <p className="text-gray-400 font-medium mt-1">Project your financial health before making major decisions.</p>
        </div>
      </div>

      <DtiSimulator 
        currentMonthlyIncome={monthlyIncome}
        currentMonthlyDebt={totalMonthlyInstallment}
        region={region}
        currency={currency}
      />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { LoansServiceFactory } from '@stashflow/api';
import { formatCurrency } from '@stashflow/core';

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const loansService = LoansServiceFactory.create(supabase);
  const { loans, totalDebt, currency } = await loansService.getLoansPageData(user.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Loans & Amortization</h2>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
          Add Loan
        </button>
      </div>

      <div className="p-6 bg-white rounded-xl border shadow-sm">
        <p className="text-sm font-medium text-gray-500 mb-1">Total Outstanding Principal</p>
        <h3 className="text-2xl font-bold">{formatCurrency(totalDebt, currency)}</h3>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Active Loans</h2>
        </div>
        <div className="divide-y">
          {loans.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No active loans found.</div>
          ) : (
            loans.map((l) => (
              <div key={l.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-xs text-gray-500">{l.interest_rate}% APR • {l.duration_months} months</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(l.principal, l.currency)}</p>
                  <p className="text-xs text-gray-500">Starts {l.start_date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

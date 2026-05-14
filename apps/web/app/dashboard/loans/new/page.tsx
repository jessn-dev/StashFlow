import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '~/lib/supabase/server';
import { LoanForm } from '~/modules/loans/components/LoanForm';

export default async function NewLoanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_currency')
    .eq('id', user.id)
    .maybeSingle();

  const preferredCurrency = profile?.preferred_currency ?? 'USD';

  return (
    <div className="max-w-lg mx-auto py-8">
      <Link href="/dashboard/loans" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 inline-block">
        ← Back to Loans
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add Loan</h1>
      <p className="text-gray-400 text-sm mb-8">
        Enter your loan details manually.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <LoanForm currencyFallback={preferredCurrency} />
      </div>
    </div>
  );
}

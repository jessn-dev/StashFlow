import Link from 'next/link';
import { LoanForm } from '@/modules/loans/components/LoanForm';

export default function NewLoanPage() {
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
        <LoanForm />
      </div>
    </div>
  );
}

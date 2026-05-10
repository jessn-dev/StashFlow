import Link from 'next/link';
import { TransactionForm } from '~/modules/transactions/components/TransactionForm';

export default function NewTransactionPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <Link 
          href="/dashboard/transactions"
          className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 mb-4"
        >
          ← Back to Transactions
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Add Transaction</h1>
        <p className="text-gray-400 font-medium mt-1">
          Record a new income source or expense to keep your dashboard accurate.
        </p>
      </div>

      <TransactionForm />
    </div>
  );
}

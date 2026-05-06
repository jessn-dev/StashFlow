import Link from 'next/link';
import { LoanUploadZone } from '@/modules/loans/components/LoanUploadZone';

export default function UploadLoanPage() {
  return (
    <div className="max-w-lg mx-auto py-8">
      <Link href="/dashboard/loans" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 inline-block">
        ← Back to Loans
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Loan Document</h1>
      <p className="text-gray-400 text-sm mb-8">
        Upload a statement or agreement — we&apos;ll help you extract your loan details.
      </p>

      <LoanUploadZone />

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">
          Prefer to type it in?{' '}
          <Link href="/dashboard/loans/new" className="text-gray-700 font-medium underline underline-offset-2 hover:text-gray-900">
            Enter details manually
          </Link>
        </p>
      </div>
    </div>
  );
}

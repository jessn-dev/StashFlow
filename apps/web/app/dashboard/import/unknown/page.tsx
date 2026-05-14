'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileQuestion, PlusCircle, Landmark, RefreshCw } from 'lucide-react';
import Link from 'next/link';

/**
 * Fallback page for documents that could not be automatically classified.
 * Offers the user options to manually categorize the document or retry.
 */
export default function UnknownDocumentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = searchParams.get('doc');

  if (!docId) {
    router.replace('/dashboard/import');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-6">
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-[24px] bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-6 shadow-inner">
          <FileQuestion size={40} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-3">Almost there!</h1>
        <p className="text-gray-500 font-medium text-lg leading-relaxed">
          We processed your document, but our AI isn't 100% sure what it is. 
          How would you like to proceed?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-10">
        <Link 
          href={`/dashboard/loans/review?doc=${docId}`}
          className="flex items-center gap-5 p-6 bg-white border border-gray-200 rounded-2xl hover:border-gray-900 hover:shadow-lg hover:shadow-gray-900/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <PlusCircle size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-gray-900">Add as a Loan</h3>
            <p className="text-sm text-gray-500">I'll review the extracted data and save it as a loan.</p>
          </div>
        </Link>

        <Link 
          href={`/dashboard/transactions/import?doc=${docId}`}
          className="flex items-center gap-5 p-6 bg-white border border-gray-200 rounded-2xl hover:border-gray-900 hover:shadow-lg hover:shadow-gray-900/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Landmark size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-gray-900">Import as Bank Statement</h3>
            <p className="text-sm text-gray-500">Treat this as a list of transactions to be imported.</p>
          </div>
        </Link>

        <Link 
          href="/dashboard/import"
          className="flex items-center gap-5 p-6 bg-gray-50 border border-transparent rounded-2xl hover:bg-gray-100 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-gray-900 group-hover:text-white transition-colors">
            <RefreshCw size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-gray-900">Try a different file</h3>
            <p className="text-sm text-gray-500">Go back and upload a different document.</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-center">
        <Link 
          href="/dashboard"
          className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

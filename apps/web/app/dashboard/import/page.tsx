'use client';

import { useRouter } from 'next/navigation';
import { SecureImportZone } from '~/modules/import';
import { useDocumentUpload } from '~/modules/import/hooks/useDocumentUpload';
import { ArrowLeft, Sparkles, FileText, Landmark } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Smart Router Entry Point: A single upload page that classifies any financial document
 * (Loan or Bank Statement) and routes the user to the appropriate specialized review UI.
 */
export default function ImportPage() {
  const router = useRouter();
  const { state, upload } = useDocumentUpload();

  const handleUpload = async (file: File, password?: string) => {
    await upload(file, password);
  };

  // Route once classified and processed
  useEffect(() => {
    if (state.status === 'ready') {
      const { documentId, documentType } = state;
      if (documentType === 'LOAN') {
        router.push(`/dashboard/loans/review?doc=${documentId}`);
      } else if (documentType === 'BANK_STATEMENT') {
        // Special case: Transactions import page handles the preview internally
        router.push(`/dashboard/transactions/import?doc=${documentId}`);
      } else {
        // UNKNOWN — let user choose or show manual entry
        router.push(`/dashboard/import/unknown?doc=${documentId}`);
      }
    }
  }, [state, router]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-10">
        <Link 
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1.5 mb-6 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
        </Link>
        <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Smart Import</h1>
        <p className="text-gray-500 font-medium text-lg">
          Upload any document — we'll figure out if it's a loan or a bank statement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Loans</h3>
            <p className="text-sm text-gray-500">Amortization schedules, contracts, or summaries.</p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Landmark size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Statements</h3>
            <p className="text-sm text-gray-500">Bank statements, credit card bills, or transaction exports.</p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">AI Powered</h3>
            <p className="text-sm text-gray-500">Automatic classification and data extraction using Llama 3.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 shadow-xl overflow-hidden p-10">
        <SecureImportZone 
          type="document"
          onUpload={handleUpload}
          isProcessing={state.status === 'uploading' || state.status === 'processing'}
        />
        
        {state.status === 'error' && (
          <p className="mt-6 text-sm font-bold text-red-600 bg-red-50 rounded-2xl px-6 py-4 text-center border border-red-100">
            {state.message}
          </p>
        )}
      </div>

      <p className="mt-8 text-center text-sm text-gray-400 font-medium">
        Encrypted PDFs are supported. You'll be prompted for a password if needed.
      </p>
    </div>
  );
}

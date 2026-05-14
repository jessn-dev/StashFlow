import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '~/lib/supabase/server';
import { DocumentStatusWatcher } from '~/modules/loans/components/DocumentStatusWatcher';
import type { DocumentRecord } from '~/modules/loans/components/DocumentStatusWatcher';

type ReviewPageProps = Readonly<{
  searchParams: Promise<{ doc?: string }>;
}>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewLoanPage({ searchParams }: ReviewPageProps) {
  const { doc } = await searchParams;

  if (!doc || !UUID_RE.test(doc)) {
    redirect('/dashboard/loans/upload');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: document }, { data: profile }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, processing_status, extracted_data, processing_error, extraction_source, inferred_type')
      .eq('id', doc)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const preferredCurrency = profile?.preferred_currency;

  return (

    <div className="max-w-[960px] mx-auto py-6 px-6">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/loans" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to Loans
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Review &amp; Confirm</h1>
        <p className="text-sm text-gray-500">
          Confirm your loan details before saving. Edit any field that looks incorrect.
        </p>
      </div>

      {document ? (
        <DocumentStatusWatcher 
          initial={document as unknown as DocumentRecord} 
          preferredCurrency={preferredCurrency}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-700 font-medium">
              Document not found — this upload link is no longer valid.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/loans/upload"
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Upload a document
            </Link>
            <Link
              href="/dashboard/loans/new"
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Enter manually →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

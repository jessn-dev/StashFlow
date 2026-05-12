'use client';

/**
 * @module DocumentStatusWatcher
 * Orchestrates the lifecycle of a document after upload. It manages real-time status updates,
 * handles processing timeouts, and dynamically renders the appropriate review form
 * (Loan or Transaction) based on the extraction results.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '~/lib/supabase/client';
import { LoanForm } from './LoanForm';
import { StatementReviewForm } from '../../transactions/components/StatementReviewForm';
import { PasswordPrompt } from './PasswordPrompt';
import { ExtractionSummaryBar } from './ExtractionSummaryBar';
import { SkeletonLayout } from './SkeletonLayout';

/** Possible states for the document processing pipeline. */
type ProcessingStatus = 'pending' | 'processing' | 'success' | 'error_rate_limit' | 'error_generic';

/** Structure for detailed error reporting from the processing worker. */
interface ProcessingErrorRecord {
  code: string;
  stage: string;
  message?: string;
}

/** Represents the database record for a document being processed. */
export interface DocumentRecord {
  id: string;
  processing_status: ProcessingStatus;
  extracted_data: any | null; 
  processing_error: ProcessingErrorRecord | null;
  extraction_source: string | null;
  inferred_type: string | null;
}

/** Properties for the DocumentStatusWatcher component. */
interface DocumentStatusWatcherProps {
  /** The initial document state fetched from the server. */
  initial: DocumentRecord;
}

const TIMEOUT_MS = 120_000;

/**
 * Main orchestrator for document processing status and review transitions.
 * 
 * @param {DocumentStatusWatcherProps} props - Component props.
 * @returns {JSX.Element} The rendered component state based on processing status.
 */
export function DocumentStatusWatcher({ initial }: DocumentStatusWatcherProps) {
  const [doc, setDoc] = useState<DocumentRecord>(initial);
  const [timedOut, setTimedOut] = useState(false);

  /*
   * PSEUDOCODE: Real-time Status Syncing
   * 1. Identify if the document is in a terminal state (success/error).
   * 2. If not terminal, subscribe to Supabase Realtime for 'UPDATE' events on this document ID.
   * 3. Simultaneously start a polling interval (5s) as a safety fallback for Realtime disconnects.
   * 4. On any update, refresh the local 'doc' state to reflect the latest extraction progress.
   * 5. Cleanup: Unsubscribe and clear interval on component unmount or status resolution.
   */
  useEffect(() => {
    const terminal: ProcessingStatus[] = ['success', 'error_rate_limit', 'error_generic'];
    if (terminal.includes(doc.processing_status)) return;

    const supabase = createClient();
    
    // Using Supabase Realtime for instant UI updates when the background worker finishes.
    const channel = supabase
      .channel(`document-status-${doc.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents', filter: `id=eq.${doc.id}` },
        (payload) => { setDoc(payload.new as DocumentRecord); }
      )
      .subscribe();

    // Fallback polling ensures the UI eventually updates even if the WebSocket connection drops.
    const poll = setInterval(async () => {
      const { data } = await supabase.from('documents').select('*').eq('id', doc.id).maybeSingle();
      if (data && data.processing_status !== doc.processing_status) {
        setDoc(data as DocumentRecord);
      }
    }, 5000);

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(poll);
    };
  }, [doc.id, doc.processing_status]);

  /*
   * PSEUDOCODE: Processing Timeout Handler
   * 1. Start a timer for 120 seconds if processing is active.
   * 2. If timer triggers, mark state as 'timedOut'.
   * 3. This triggers a UI fallback allowing manual entry if the worker is stalled.
   */
  useEffect(() => {
    const terminal: ProcessingStatus[] = ['success', 'error_rate_limit', 'error_generic'];
    if (terminal.includes(doc.processing_status)) return;
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [doc.id, doc.processing_status]);

  const isPending = doc.processing_status === 'pending' || doc.processing_status === 'processing';

  /*
   * PSEUDOCODE: UI State Resolution
   * 1. IF pending AND timed out -> Show timeout error with manual entry buttons.
   * 2. IF still pending -> Show skeleton loading state.
   * 3. IF error is 'password' -> Show PasswordPrompt for encrypted PDFs.
   * 4. IF success AND has loans -> Render LoanForm(s).
   * 5. IF success AND has transactions -> Render StatementReviewForm.
   * 6. ELSE -> Show fatal error state with retry option.
   */
  if (isPending && timedOut) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Processing took too long</h3>
        <p className="text-sm text-gray-500 mb-6">We're having trouble parsing this document automatically.</p>
        <div className="flex gap-3 justify-center">
            <Link href="/dashboard/loans/new" className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold">Manual Loan</Link>
            <Link href="/dashboard/transactions/new" className="px-5 py-2.5 border border-gray-200 rounded-lg font-bold">Manual Transaction</Link>
        </div>
      </div>
    );
  }

  if (isPending) return <SkeletonLayout />;

  // Case: Encrypted PDF detection (Requires Password)
  // We identify this specific error to provide a specialized UI for decryption retry.
  if (doc.processing_status === 'error_generic' && doc.processing_error?.message?.includes('password')) {
     return <PasswordPrompt docId={doc.id} onRetry={() => setDoc(prev => ({ ...prev, processing_status: 'processing' }))} />;
  }

  // Case: Successful extraction, awaiting review
  if (doc.processing_status === 'success' && doc.extracted_data) {
     const data = doc.extracted_data;
     
     // Sub-flow: Loan Extraction
     if (data.loans) {
        return (
          <div className="space-y-12">
            {data.loans.map((loan: any, i: number) => (
              <div key={i} className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden p-8">
                 <ExtractionSummaryBar type="LOAN" data={loan} validation={data.validation} />
                 <LoanForm docId={doc.id} initial={loan} provenance={loan.provenance} />
              </div>
            ))}
          </div>
        );
     }
     
     // Sub-flow: Bank Statement Extraction
     if (data.transactions) {
        return (
          <div className="space-y-8">
             <ExtractionSummaryBar type="STATEMENT" data={data} validation={data.validation} />
             <StatementReviewForm 
               docId={doc.id}
               initialTransactions={data.transactions}
               accountName={data.account_name}
               statementPeriod={data.statement_period}
             />
          </div>
        );
     }
  }

  // Case: Fatal error or unhandled state
  // Fallback UI for any unrecovered processing failures.
  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
       <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">✕</div>
       <h3 className="text-lg font-bold text-gray-900 mb-2">Analysis Failed</h3>
       <p className="text-sm text-gray-500 mb-6">{doc.processing_error?.message || 'We encountered an error while analyzing this file.'}</p>
       <Link href="/dashboard/loans/upload" className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold">Try Another File</Link>
    </div>
  );
}

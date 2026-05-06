'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoanForm } from './LoanForm';
import type { LoanFormValues } from './LoanForm';

type ProcessingStatus = 'pending' | 'processing' | 'success' | 'error_rate_limit' | 'error_generic';

interface ExtractedLoanData {
  name?: string | null;
  principal?: number | null;
  currency?: string | null;
  interest_rate?: number | null;
  duration_months?: number | null;
  installment_amount?: number | null;
  lender?: string | null;
  start_date?: string | null;
  interest_type?: string | null;
  interest_basis?: string | null;
}

interface MultiLoanExtractedData {
  loans: ExtractedLoanData[];
}

interface ProcessingErrorRecord {
  code: string;
  stage: string;
}

export interface DocumentRecord {
  id: string;
  processing_status: ProcessingStatus;
  extracted_data: MultiLoanExtractedData | null;
  processing_error: ProcessingErrorRecord | null;
  extraction_source: string | null;
}

interface DocumentStatusWatcherProps {
  initial: DocumentRecord;
}

// Fields and their weights for confidence scoring
const FIELD_WEIGHTS: Record<keyof ExtractedLoanData, number> = {
  principal: 0.25,
  interest_rate: 0.20,
  duration_months: 0.15,
  installment_amount: 0.10,
  currency: 0.10,
  start_date: 0.08,
  name: 0.05,
  lender: 0.04,
  interest_type: 0.02,
  interest_basis: 0.01,
};

const REQUIRED_FIELDS: (keyof ExtractedLoanData)[] = ['name', 'principal', 'interest_rate', 'duration_months', 'start_date'];
const OPTIONAL_FIELDS: (keyof ExtractedLoanData)[] = ['currency', 'lender', 'installment_amount', 'interest_type', 'interest_basis'];

function computeConfidence(data: ExtractedLoanData): number {
  return (Object.keys(FIELD_WEIGHTS) as (keyof ExtractedLoanData)[]).reduce((sum, key) => {
    return sum + (data[key] != null ? FIELD_WEIGHTS[key] : 0);
  }, 0);
}

interface FieldCounts {
  extracted: number;
  needsInput: number;
  needsReview: number;
}

function computeFieldCounts(data: ExtractedLoanData): FieldCounts {
  const extracted = (Object.keys(data) as (keyof ExtractedLoanData)[]).filter(k => data[k] != null).length;
  const needsInput = REQUIRED_FIELDS.filter(k => data[k] == null).length;
  const needsReview = OPTIONAL_FIELDS.filter(k => data[k] == null).length;
  return { extracted, needsInput, needsReview };
}

interface ConfidenceConfig {
  label: string;
  bg: string;
  border: string;
  badgeBg: string;
  textColor: string;
}

function getConfidenceConfig(score: number): ConfidenceConfig {
  if (score >= 0.85) return {
    label: 'High',
    bg: '#ECFDF5',
    border: '#10B981',
    badgeBg: '#D1FAE5',
    textColor: '#065F46',
  };
  if (score >= 0.70) return {
    label: 'Medium',
    bg: '#FFFBEB',
    border: '#F59E0B',
    badgeBg: '#FEF3C7',
    textColor: '#92400E',
  };
  return {
    label: 'Low',
    bg: '#FEF2F2',
    border: '#EF4444',
    badgeBg: '#FEE2E2',
    textColor: '#991B1B',
  };
}

function ExtractionSummaryBar({
  data,
  message,
  forceLow,
}: {
  data: ExtractedLoanData | null;
  message?: string;
  forceLow?: boolean;
}) {
  if (!data && !message) return null;

  if (message) {
    return (
      <div
        className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between"
        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
      >
        <span className="text-sm text-gray-500">{message}</span>
      </div>
    );
  }

  const d = data!;
  const score = forceLow ? 0 : computeConfidence(d);
  const counts = computeFieldCounts(d);
  const cfg = forceLow ? getConfidenceConfig(0) : getConfidenceConfig(score);

  return (
    <div
      className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: cfg.textColor }}>
        <span>✅ {counts.extracted} fields extracted</span>
        {counts.needsInput > 0 && <span>⚠️ {counts.needsInput} need input</span>}
        {counts.needsReview > 0 && <span>🔍 {counts.needsReview} need review</span>}
      </div>
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: cfg.badgeBg, color: cfg.textColor }}
      >
        Confidence: {cfg.label}
      </span>
    </div>
  );
}

// Skeleton field placeholder
function SkeletonField({ wide }: { wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse mb-1.5" />
      <div className="flex gap-2 items-center">
        <div className="h-10 flex-1 rounded-lg bg-gray-100 animate-pulse" />
        <span className="text-xs text-gray-300 animate-pulse whitespace-nowrap">Detecting…</span>
      </div>
    </div>
  );
}

function SkeletonLayout() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Summary bar */}
      <div className="px-6 pt-6">
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
        >
          <span className="text-sm text-gray-400 animate-pulse">Extracting fields…</span>
          <span className="text-xs bg-gray-200 text-transparent rounded-full px-3 py-1 animate-pulse">Detecting</span>
        </div>

        {/* Financial snapshot skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {['Monthly Payment', 'Total Interest', 'Payoff Date'].map(label => (
            <div key={label} className="rounded-xl p-4" style={{ background: '#F9FAFB' }}>
              <p className="text-xs uppercase text-gray-400 mb-1">{label}</p>
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Core fields skeleton */}
      <div className="px-6 pb-6">
        <p className="text-base font-semibold text-gray-900 mb-4">Core Loan Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonField wide />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
      </div>

      {/* Sticky footer skeleton */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 px-6 py-4 flex items-center justify-between rounded-b-2xl">
        <div className="h-9 w-20 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function HardFailureCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-gray-900 mb-2">
        We couldn&apos;t extract usable data from this document.
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        The file type may not be supported, or the document doesn&apos;t contain readable loan data.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/dashboard/loans/new"
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
        >
          Enter details manually
        </Link>
        <Link
          href="/dashboard/loans/upload"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors border border-gray-200 rounded-lg"
        >
          Upload another document
        </Link>
      </div>
    </div>
  );
}

function extractedToFormValues(data: ExtractedLoanData): Partial<LoanFormValues> {
  return {
    ...(data.name != null ? { name: data.name } : {}),
    ...(data.principal != null ? { principal: String(data.principal) } : {}),
    ...(data.currency != null ? { currency: data.currency } : {}),
    ...(data.interest_rate != null ? { interest_rate: String(data.interest_rate) } : {}),
    ...(data.duration_months != null ? { duration_months: String(data.duration_months) } : {}),
    ...(data.installment_amount != null ? { installment_amount: String(data.installment_amount) } : {}),
    ...(data.lender != null ? { lender: data.lender } : {}),
    ...(data.start_date != null ? { start_date: data.start_date } : {}),
    ...(data.interest_type != null ? { interest_type: data.interest_type } : {}),
    ...(data.interest_basis != null ? { interest_basis: data.interest_basis } : {}),
  };
}

const TIMEOUT_MS = 90_000;

export function DocumentStatusWatcher({ initial }: DocumentStatusWatcherProps) {
  const [doc, setDoc] = useState<DocumentRecord>(initial);
  const [timedOut, setTimedOut] = useState(false);
  const [ignoredIndices, setIgnoredIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const terminal: ProcessingStatus[] = ['success', 'error_rate_limit', 'error_generic'];
    if (terminal.includes(doc.processing_status)) return;

    console.log(`[DocumentStatusWatcher] Subscribing to realtime updates for ${doc.id}`);
    const supabase = createClient();
    const channel = supabase
      .channel(`document-status-${doc.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents', filter: `id=eq.${doc.id}` },
        (payload) => { 
          console.log('[DocumentStatusWatcher] Realtime update received:', payload.new.processing_status);
          setDoc(payload.new as DocumentRecord); 
        }
      )
      .subscribe((status) => {
        console.log('[DocumentStatusWatcher] Realtime subscription status:', status);
      });

    // Polling fallback (every 3s) in case realtime is blocked or slow
    const poll = setInterval(async () => {
      console.log('[DocumentStatusWatcher] Polling for updates...');
      const { data } = await supabase
        .from('documents')
        .select('id, processing_status, extracted_data, processing_error, extraction_source')
        .eq('id', doc.id)
        .maybeSingle();
      
      const docData = data as any;
      if (docData && docData.processing_status !== doc.processing_status) {
        console.log('[DocumentStatusWatcher] Polling update found:', docData.processing_status);
        setDoc(docData as DocumentRecord);
      }
    }, 3000);

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(poll);
    };
  }, [doc.id, doc.processing_status]);

  useEffect(() => {
    const terminal: ProcessingStatus[] = ['success', 'error_rate_limit', 'error_generic'];
    if (terminal.includes(doc.processing_status)) return;
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPending = doc.processing_status === 'pending' || doc.processing_status === 'processing';

  // Pending + timed out → form with all-missing tags
  if (isPending && timedOut) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 pt-6">
          <ExtractionSummaryBar
            data={{ name: null, principal: null, interest_rate: null, duration_months: null, start_date: null }}
            forceLow
          />
          <p className="text-xs text-gray-500 mb-5">
            Taking longer than expected — enter your loan details below. Nothing is saved until you confirm.
          </p>
        </div>
        <div className="px-6 pb-0">
          <LoanForm docId={doc.id} extractedFields={[]} />
        </div>
      </div>
    );
  }

  // Pending → skeleton
  if (isPending) {
    return <SkeletonLayout />;
  }

  // Hard failure — unsupported type
  if (
    doc.processing_status === 'error_generic' &&
    doc.processing_error?.code === 'UNSUPPORTED_TYPE'
  ) {
    return <HardFailureCard />;
  }

  // Rate limit
  if (doc.processing_status === 'error_rate_limit') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 pt-6">
          <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3" style={{ background: '#FFFBEB', border: '1px solid #F59E0B' }}>
            <span className="mt-0.5">⚠️</span>
            <p className="text-sm font-medium" style={{ color: '#92400E' }}>
              Processing delayed — enter your loan details manually below.
            </p>
          </div>
        </div>
        <div className="px-6 pb-0">
          <LoanForm docId={doc.id} extractedFields={[]} />
        </div>
      </div>
    );
  }

  // Generic error (recoverable) — form with empty extracted fields
  if (doc.processing_status === 'error_generic') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 pt-6">
          <ExtractionSummaryBar
            data={{ name: null, principal: null, interest_rate: null, duration_months: null, start_date: null }}
            forceLow
          />
          <p className="text-xs text-gray-500 mb-5">
            We found limited data — complete the details below.{' '}
            <Link href="/dashboard/loans/new" className="underline underline-offset-2 hover:text-gray-700">
              Start fresh →
            </Link>
          </p>
        </div>
        <div className="px-6 pb-0">
          <LoanForm docId={doc.id} extractedFields={[]} />
        </div>
      </div>
    );
  }

  // Success
  const allLoans = doc.extracted_data?.loans || [];
  const activeLoans = allLoans.filter((_, i) => !ignoredIndices.has(i));
  
  if (activeLoans.length === 0 && allLoans.length > 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">All entries ignored</h3>
        <p className="text-sm text-gray-500 mb-6">You have discarded all detected loans from this document.</p>
        <Link href="/dashboard/loans" className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (allLoans.length === 0) {
    return <HardFailureCard />;
  }

  return (
    <div className="space-y-10">
      <div className="px-6 pt-6">
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
          {/* Decorative background shape */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-blue-900 tracking-tight">
              {activeLoans.length} {activeLoans.length === 1 ? 'Entry' : 'Entries'} to Review
            </h3>
            <p className="text-blue-700 mt-2 font-medium">
              Verify the details extracted by our AI. You can edit any field or discard unwanted entries.
            </p>
          </div>
          <div className="flex items-center gap-4 relative z-10">
             <Link 
               href="/dashboard/loans"
               className="px-5 py-2.5 text-sm font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
             >
               Cancel All
             </Link>
             <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-blue-100/50">
               {activeLoans.length === 1 ? '📄' : '📚'}
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        {allLoans.map((loanData, index) => {
          if (ignoredIndices.has(index)) return null;

          const formValues = extractedToFormValues(loanData);
          const extractedFields = (Object.keys(loanData) as (keyof ExtractedLoanData)[])
            .filter(k => loanData[k] != null);

          return (
            <div key={index} className="relative group animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="absolute -top-5 left-8 flex items-center gap-3 z-20">
                <div className="px-6 py-2 bg-[#0A2540] text-white text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-2xl">
                  Entry #{index + 1}
                </div>
                <button
                  onClick={() => setIgnoredIndices(prev => new Set(prev).add(index))}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-[0.1em] rounded-full hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                >
                  Discard Entry
                </button>
              </div>
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden transition-all group-hover:border-gray-200 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)]">
                <div className="px-8 pt-10">
                   <ExtractionSummaryBar data={loanData} />
                </div>
                <div className="px-8 pb-4">
                  <LoanForm
                    docId={doc.id}
                    initial={formValues}
                    extractedFields={extractedFields}
                    title={allLoans.length > 1 ? `Review Extracted Details — Entry #${index + 1}` : 'Loan Details'}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

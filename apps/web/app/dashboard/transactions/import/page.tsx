'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { SecureImportZone } from '~/modules/import/components/SecureImportZone';
import { CsvMapper } from '~/modules/import/components/CsvMapper';
import { normalizeToISODate } from '~/modules/import';
import { createClient } from '~/lib/supabase/client';
import { useDocumentUpload } from '~/modules/import/hooks/useDocumentUpload';
import { ArrowLeft, CheckCircle2, LayoutDashboard, History, Sparkles } from 'lucide-react';
import Link from 'next/link';

type ImportStage = 'upload' | 'mapping' | 'preview' | 'success';

/**
 * Page component for importing transactions via CSV or AI-powered PDF parsing.
 * Manages the multi-stage import workflow: Upload -> Mapping -> Preview -> Success.
 */
export default function TransactionImportPage({ searchParams }: { searchParams: Promise<{ doc?: string }> }) {
  const { doc: initialDocId } = use(searchParams);
  const [stage, setStage] = useState<ImportStage>('upload');
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [skippedTransfers, setSkippedTransfers] = useState<number>(0);
  const [wasAiImport, setWasAiImport] = useState<boolean>(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  
  const router = useRouter();
  const supabase = createClient();
  const { state: uploadState, upload: uploadDoc } = useDocumentUpload();

  /**
   * Fetches the extracted transaction data from a processed document and transitions to preview.
   */
  const fetchAndPreview = useCallback(async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('extracted_data, processing_status')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      // Handle cases where document is still processing if accessed via direct URL
      if (data.processing_status !== 'success') {
        setStage('upload'); 
        return;
      }

      if ((data?.extracted_data as any)?.transactions) {
        const extracted = data.extracted_data as any;
        const allTransactions = extracted.transactions ?? [];
        const transfers = allTransactions.filter((t: any) => t.transaction_type === 'internal_transfer');
        const importable = allTransactions.filter((t: any) => t.transaction_type !== 'internal_transfer');

        const aiMapped = importable.map((t: any) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          account_id: t.account_id ?? null,
          transaction_type: t.transaction_type,
          type: t.amount >= 0 ? 'income' : 'expense'
        }));
        
        setMappedData(aiMapped);
        setSkippedTransfers(transfers.length);
        setValidationWarnings(extracted.validation?.requires_verification ? (extracted.validation?.errors ?? []) : []);
        setWasAiImport(true);
        setStage('preview');
      } else {
        throw new Error('No transactions found in statement.');
      }
    } catch (err: any) {
      console.error('[TransactionImport] Failed to fetch extracted data:', err);
      setStage('upload');
    }
  }, [supabase]);

  // Handle routing/preview once document is classified and processed
  useEffect(() => {
    if (uploadState.status === 'ready' && uploadState.documentType === 'BANK_STATEMENT') {
      fetchAndPreview(uploadState.documentId);
    }
    // If it's a loan, we could optionally redirect to the loan review page
    if (uploadState.status === 'ready' && uploadState.documentType === 'LOAN') {
      router.push(`/dashboard/loans/review?doc=${uploadState.documentId}`);
    }
  }, [uploadState, fetchAndPreview, router]);

  // Handle initial document ID from URL
  useEffect(() => {
    if (initialDocId) {
      fetchAndPreview(initialDocId);
    }
  }, [initialDocId, fetchAndPreview]);

  /**
   * Handles the file upload and initial processing (CSV parsing or PDF AI extraction).
   */
  const handleUpload = async (file: File, password?: string) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'csv') {
      return new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setCsvData({
                headers: Object.keys(results.data[0] as any),
                rows: results.data
              });
              setStage('mapping');
              resolve();
            } else {
              reject(new Error('CSV file is empty.'));
            }
          },
          error: (error) => reject(error)
        });
      });
    }

    if (ext === 'pdf') {
      await uploadDoc(file, password);
      // Logic continues in useEffect above once state is 'ready'
    }
  };

  const handleCsvMapped = (data: any[]) => {
    setMappedData(data);
    setStage('preview');
  };

  /**
   * Finalizes the import by bulk inserting incomes and expenses into the database.
   *
   * @throws Never — errors are caught and stored in `importError` state.
   *
   * PSEUDOCODE: Execute Import
   * 1. Authenticate; bail early if no session.
   * 2. Fetch user profile for preferred currency.
   * 3. Normalize each row's date to ISO 8601; abort with user-facing error on bad dates.
   * 4. Partition rows into incomes vs expenses.
   * 5. Parallel bulk insert into Supabase; surface any DB error with detail.
   * 6. Advance to success stage.
   */
  const executeImport = async () => {
    setImportError(null);

    // G8 — Pre-import guard on mapped data
    const invalid = mappedData.filter(d => 
      !isFinite(Number(d.amount)) || Number(d.amount) === 0 || !d.description?.trim()
    );
    if (invalid.length > 0) {
      setImportError(`${invalid.length} transactions have invalid data (zero amount or missing description) — please review before importing.`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('id', user.id)
      .single();

    const userCurrency = profile?.preferred_currency ?? 'USD';

    // Normalize dates before touching the DB — raw CSV dates are rarely ISO format.
    const badDates = mappedData.filter(d => !normalizeToISODate(String(d.date)));
    if (badDates.length > 0) {
      const sample = String(badDates[0]?.date ?? '');
      setImportError(
        `Unrecognized date format: "${sample}". Expected YYYY-MM-DD, MM/DD/YYYY, or DD-Mon-YYYY.`
      );
      return;
    }

    const incomes = mappedData
      .filter(d => d.type === 'income')
      .map(d => ({
        user_id: user.id,
        amount: Math.abs(d.amount),
        source: d.description,
        date: normalizeToISODate(String(d.date))!,
        currency: userCurrency,
        frequency: 'one-time' as const,
      }));

    const expenses = mappedData
      .filter(d => d.type === 'expense')
      .map(d => ({
        user_id: user.id,
        amount: Math.abs(d.amount),
        description: d.description,
        date: normalizeToISODate(String(d.date))!,
        currency: userCurrency,
        category: 'other' as const,
      }));

    const [incomeResult, expenseResult] = await Promise.all([
      incomes.length > 0 ? supabase.from('incomes').insert(incomes) : Promise.resolve({ error: null }),
      expenses.length > 0 ? supabase.from('expenses').insert(expenses) : Promise.resolve({ error: null }),
    ]);

    const firstError = incomeResult.error ?? expenseResult.error;
    if (firstError) {
      console.error('[TransactionImport] Insert failed:', firstError);
      setImportError(`Import failed: ${firstError.message}`);
      return;
    }

    setImportResult({ count: mappedData.length });
    setStage('success');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/transactions"
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-900 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Import Activity</h1>
            <p className="text-gray-400 font-medium mt-1">Build your timeline with automated imports.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${stage === 'upload' ? 'bg-gray-900' : 'bg-gray-200'}`} />
           <div className={`w-2 h-2 rounded-full ${stage === 'mapping' ? 'bg-gray-900' : 'bg-gray-200'}`} />
           <div className={`w-2 h-2 rounded-full ${stage === 'preview' ? 'bg-gray-900' : 'bg-gray-200'}`} />
           <div className={`w-2 h-2 rounded-full ${stage === 'success' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
        </div>
      </div>

      {stage === 'upload' && (
        <div className="max-w-2xl mx-auto py-10">
          <SecureImportZone 
            type="transaction" 
            onUpload={handleUpload}
            isProcessing={uploadState.status === 'uploading' || uploadState.status === 'processing'}
          />
          {uploadState.status === 'error' && (
            <p className="mt-4 text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
              {uploadState.message}
            </p>
          )}
        </div>
      )}

      {stage === 'mapping' && csvData && (
        <CsvMapper 
          headers={csvData.headers} 
          data={csvData.rows} 
          onConfirm={handleCsvMapped}
          onCancel={() => setStage('upload')}
        />
      )}

      {stage === 'preview' && (
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-xl font-black text-gray-900 tracking-tight">Review Import</h3>
                 {wasAiImport && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      <Sparkles size={10} /> AI Enhanced
                    </span>
                 )}
               </div>
               <p className="text-sm text-gray-400 font-medium mt-1">
                 We detected {mappedData.length} transaction{mappedData.length !== 1 ? 's' : ''}.
                 {skippedTransfers > 0 && (
                   <span className="text-gray-400">
                     {' '}{skippedTransfers} internal transfer{skippedTransfers !== 1 ? 's' : ''} excluded.
                   </span>
                 )}
               </p>
             </div>
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setStage('upload')}
                 className="px-6 h-12 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
               >
                 Back
               </button>
               <button
                 onClick={executeImport}
                 className="px-8 h-12 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-900/10"
               >
                 Confirm and Import <CheckCircle2 size={16} />
               </button>
             </div>
             {importError && (
               <p className="mt-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">
                 {importError}
               </p>
             )}
          </div>
          {validationWarnings.length > 0 && (
            <div className="mx-8 mt-4 mb-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Review Carefully</p>
              <ul className="text-xs text-amber-600 space-y-0.5">
                {validationWarnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-md z-10">
                <tr>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  {mappedData.some(r => r.account_id) && (
                    <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Account</th>
                  )}
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mappedData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 text-[13px] font-medium text-gray-500">{row.date}</td>
                    {mappedData.some(r => r.account_id) && (
                      <td className="px-8 py-4 text-[13px] font-medium text-gray-400">
                        {row.account_id ? `···${row.account_id}` : '—'}
                      </td>
                    )}
                    <td className="px-8 py-4 text-[13px] font-bold text-gray-900">{row.description}</td>
                    <td className={`px-8 py-4 text-[13px] font-black text-right ${row.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {row.type === 'expense' ? '-' : '+'}{Math.abs(row.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stage === 'success' && (
        <div className="max-w-xl mx-auto py-20 text-center animate-in fade-in zoom-in-95 duration-700">
           <div className="w-24 h-24 rounded-[32px] bg-emerald-50 flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-inner">
             <CheckCircle2 size={48} strokeWidth={2.5} />
           </div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Import Successful</h2>
           <p className="text-[17px] text-gray-400 font-medium max-w-[320px] mx-auto leading-relaxed mb-10">
             We added {importResult?.count} transactions to your financial timeline.
           </p>
           
           <div className="flex flex-col gap-3">
             <Link 
               href="/dashboard/transactions"
               className="h-14 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10"
             >
               View Timeline <History size={18} />
             </Link>
             <Link 
               href="/dashboard"
               className="h-14 border border-gray-200 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
             >
               Go to Dashboard <LayoutDashboard size={18} />
             </Link>
           </div>
        </div>
      )}
    </div>
  );
}

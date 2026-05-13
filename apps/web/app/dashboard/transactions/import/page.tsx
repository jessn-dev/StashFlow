'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { SecureImportZone } from '~/modules/import/components/SecureImportZone';
import { CsvMapper } from '~/modules/import/components/CsvMapper';
import { normalizeToISODate } from '~/modules/import';
import { createClient } from '~/lib/supabase/client';
import { ArrowLeft, CheckCircle2, LayoutDashboard, History, Sparkles } from 'lucide-react';
import Link from 'next/link';

type ImportStage = 'upload' | 'mapping' | 'preview' | 'success';

/**
 * Page component for importing transactions via CSV or AI-powered PDF parsing.
 * Manages the multi-stage import workflow: Upload -> Mapping -> Preview -> Success.
 */
export default function TransactionImportPage() {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  /**
   * Handles the file upload and initial processing (CSV parsing or PDF AI extraction).
   * 
   * PSEUDOCODE: Transaction Upload & Process
   * 1. Detect file extension (CSV or PDF).
   * 2. For CSV: Parse using PapaParse and transition to mapping stage.
   * 3. For PDF: 
   *    a. Upload to private storage.
   *    b. Insert document record with 'pending' status.
   *    c. Invoke 'parse-document' edge function.
   *    d. Poll database until status is 'success' or 'error'.
   *    e. Map AI-extracted transactions to internal preview format.
   */
  const handleUpload = async (file: File, password?: string) => {
    setProcessingError(null);
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
      setIsAiProcessing(true);
      try {
        /*
         * PSEUDOCODE: PDF Bank Statement Upload
         * 1. Route through upload-document for server-side validation:
         *    - MIME type + magic bytes check, 5 MB cap, SHA-256 dedup.
         *    - Storage upload + documents row created; DB trigger fires parse-document.
         * 2. If duplicate and already processed, reuse existing extracted_data.
         * 3. For password-protected files, manually re-invoke parse-document with the key.
         *    (The DB trigger on INSERT has no access to the user-supplied password.)
         * 4. Poll until processing_status is 'success' or an error variant.
         * 5. Map extracted transactions to internal preview format.
         */
        const formData = new FormData();
        formData.append('file', file);

        const { data: uploadResult, error: uploadErr } = await supabase.functions.invoke('upload-document', {
          body: formData,
        });

        if (uploadErr || !uploadResult?.document) throw new Error('Upload failed. Try again.');

        const doc = uploadResult.document;

        // Reuse extracted_data if exact same file was already successfully processed.
        if (uploadResult.duplicated && doc.processing_status === 'success' && doc.extracted_data?.transactions) {
          const aiMapped = doc.extracted_data.transactions.map((t: any) => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.amount >= 0 ? 'income' : 'expense'
          }));
          setMappedData(aiMapped);
          setStage('preview');
          return;
        }

        // For password-protected files the DB trigger fires without the key and will fail.
        // Manual invocation here overrides it with the correct password.
        if (password) {
          const { error: funcError } = await supabase.functions.invoke('parse-document', {
            body: { record: { id: doc.id } },
            headers: { 'x-document-password': password }
          });
          if (funcError) throw funcError;
        }

        // Poll — the DB trigger already started parse-document on insert.
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes at 2s interval

        const poll = async (): Promise<any> => {
          if (attempts >= maxAttempts) throw new Error('Processing timed out. The statement might be very large.');

          const { data, error } = await supabase
            .from('documents')
            .select('processing_status, extracted_data, processing_error')
            .eq('id', doc.id)
            .single();

          if (error) throw error;

          if (data.processing_status === 'success') {
            return data.extracted_data;
          }

          if (data.processing_status.startsWith('error')) {
            const err = (data.processing_error as any);
            throw new Error(err?.message || 'AI extraction failed.');
          }

          attempts++;
          await new Promise(r => setTimeout(r, 2000));
          return poll();
        };

        const extractedData = await poll();

        if (extractedData?.transactions) {
          const aiMapped = extractedData.transactions.map((t: any) => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.amount >= 0 ? 'income' : 'expense'
          }));
          setMappedData(aiMapped);
          setStage('preview');
        } else {
          throw new Error('No transactions found in statement.');
        }

      } catch (err: any) {
        console.error('[TransactionImport] PDF processing failed:', err);
        setProcessingError(err.message || 'Failed to process PDF statement.');
        setIsAiProcessing(false);
        throw err; // Re-throw so SecureImportZone shows the error
      } finally {
        setIsAiProcessing(false);
      }
      return;
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
          />
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
                 {isAiProcessing && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      <Sparkles size={10} /> AI Enhanced
                    </span>
                 )}
               </div>
               <p className="text-sm text-gray-400 font-medium mt-1">We detected {mappedData.length} transactions.</p>
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
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-md z-10">
                <tr>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mappedData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 text-[13px] font-medium text-gray-500">{row.date}</td>
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

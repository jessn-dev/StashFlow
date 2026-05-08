'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { SecureImportZone } from '@/modules/import/components/SecureImportZone';
import { CsvMapper } from '@/modules/import/components/CsvMapper';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle2, ChevronRight, LayoutDashboard, History } from 'lucide-react';
import Link from 'next/link';

type ImportStage = 'upload' | 'mapping' | 'preview' | 'success';

export default function TransactionImportPage() {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const router = useRouter();

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
      // PDF handling will involve uploading to Supabase and triggering edge function
      // For now, we'll throw "not implemented" until we have the edge function
      throw new Error('PDF transaction parsing is coming soon. Please use CSV for now.');
    }
  };

  const handleCsvMapped = (data: any[]) => {
    setMappedData(data);
    setStage('preview');
  };

  const executeImport = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user's preferred currency
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('id', user.id)
      .single();

    const userCurrency = profile?.preferred_currency || 'USD';

    // Filter into incomes and expenses
    const incomes = mappedData.filter(d => d.type === 'income').map(d => ({
      user_id: user.id,
      amount: Math.abs(d.amount),
      source: d.description,
      date: d.date,
      currency: userCurrency,
      frequency: 'one-time' as const
    }));

    const expenses = mappedData.filter(d => d.type === 'expense').map(d => ({
      user_id: user.id,
      amount: Math.abs(d.amount),
      description: d.description,
      date: d.date,
      currency: userCurrency,
      category: 'other' as const
    }));

    // Bulk insert
    const results = await Promise.all([
      incomes.length > 0 ? supabase.from('incomes').insert(incomes) : Promise.resolve({ error: null }),
      expenses.length > 0 ? supabase.from('expenses').insert(expenses) : Promise.resolve({ error: null }),
    ]);

    if (results.some(r => r.error)) {
      alert('Failed to import some transactions. Please check your data.');
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
               <h3 className="text-xl font-black text-gray-900 tracking-tight">Review Import</h3>
               <p className="text-sm text-gray-400 font-medium mt-1">We detected {mappedData.length} transactions.</p>
             </div>
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setStage('mapping')}
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

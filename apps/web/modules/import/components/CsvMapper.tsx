'use client';

import { useState, useMemo } from 'react';
import { Table, AlertTriangle, CheckCircle2, ChevronRight, X } from 'lucide-react';

type CsvMapperProps = Readonly<{
  data: any[];
  headers: string[];
  onConfirm: (mappedData: any[]) => void;
  onCancel: () => void;
}>;

const REQUIRED_FIELDS = [
  { key: 'date', label: 'Date', description: 'Transaction date (e.g. 2024-05-01)' },
  { key: 'description', label: 'Description', description: 'Merchant name or description' },
  { key: 'amount', label: 'Amount', description: 'Transaction amount (positive or negative)' },
];

export function CsvMapper({ data, headers, onConfirm, onCancel }: CsvMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    // Auto-detect column mappings from common bank export header names.
    const autoMappings: Record<string, string> = {};
    headers.forEach(h => {
      const normalized = h.toLowerCase().trim();
      if (normalized.includes('date')) autoMappings['date'] = h;
      if (normalized.includes('desc') || normalized.includes('memo') || normalized.includes('merchant')) autoMappings['description'] = h;
      if (normalized.includes('amount') || normalized.includes('sum') || normalized.includes('value')) autoMappings['amount'] = h;
    });
    return autoMappings;
  });

  const isComplete = REQUIRED_FIELDS.every(f => !!mappings[f.key]);

  const previewData = useMemo(() => {
    if (!isComplete) return [];
    return data.slice(0, 5).map(row => ({
      date: row[mappings.date!],
      description: row[mappings.description!],
      amount: row[mappings.amount!],
    }));
  }, [data, mappings, isComplete]);

  const handleConfirm = () => {
    const mapped = data.map(row => ({
      date: row[mappings.date!],
      description: row[mappings.description!],
      amount: Number.parseFloat(String(row[mappings.amount!] || '0').replace(/[^0-9.-]+/g, '')),
      type: Number.parseFloat(String(row[mappings.amount!] || '0').replace(/[^0-9.-]+/g, '')) >= 0 ? 'income' : 'expense'
    }));
    onConfirm(mapped);
  };

  return (
    <div className="w-full bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Map your columns</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Tell us which column is which to continue.</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Mapping Controls */}
          <div className="space-y-6">
            {REQUIRED_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[13px] font-black uppercase tracking-wider text-gray-900">{field.label}</label>
                  {mappings[field.key] ? (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Mapped
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} /> Required
                    </span>
                  )}
                </div>
                <select
                  value={mappings[field.key] || ''}
                  onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none text-sm font-medium appearance-none cursor-pointer"
                >
                  <option value="">Select column...</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 font-medium px-1">{field.description}</p>
              </div>
            ))}

            <div className="pt-4">
              <button
                disabled={!isComplete}
                onClick={handleConfirm}
                className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  isComplete 
                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10 hover:bg-gray-800 hover:-translate-y-0.5' 
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                Continue to Preview <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-gray-400">
              <Table size={16} />
              <span className="text-[11px] font-black uppercase tracking-widest">Live Preview</span>
            </div>
            
            {isComplete ? (
              <div className="space-y-3">
                {previewData.map((row, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{row.description || '—'}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{row.date || '—'}</p>
                    </div>
                    <p className={`text-[13px] font-black ${String(row.amount).includes('-') ? 'text-red-500' : 'text-emerald-500'}`}>
                      {row.amount || '0.00'}
                    </p>
                  </div>
                ))}
                <p className="text-[11px] text-gray-400 text-center pt-2 font-medium">
                  Showing first 5 of {data.length} transactions
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 mb-4" />
                <p className="text-xs font-bold text-gray-500 leading-relaxed max-w-[160px]">
                  Finish mapping columns to see a preview of your data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '~/lib/supabase/client';
import { ASSET_TYPES, CURRENCIES } from '@stashflow/core';
import type { Asset, AssetType } from '@stashflow/core';

interface AssetFormProps {
  onSuccess?: () => void;
  initialData?: Asset | undefined;
}

export function AssetForm({ onSuccess, initialData }: AssetFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState({
    name: initialData?.name ?? '',
    type: initialData?.type ?? 'cash' as AssetType,
    balance: initialData ? String(initialData.balance) : '',
    currency: initialData?.currency ?? 'USD',
    institution: initialData?.institution ?? '',
    notes: initialData?.notes ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    const balance = parseFloat(values.balance);
    if (isNaN(balance)) { setError('Invalid balance'); setLoading(false); return; }

    const payload = {
      name: values.name,
      type: values.type,
      balance,
      currency: values.currency,
      institution: values.institution || null,
      notes: values.notes || null,
    };

    let dbError;
    if (isEditing && initialData) {
      const { error: updateError } = await supabase
        .from('assets')
        .update(payload)
        .eq('id', initialData.id)
        .eq('user_id', user.id);
      dbError = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          ...payload,
        });
      dbError = insertError;
    }

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
    } else {
      router.refresh();
      if (onSuccess) onSuccess();
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-gray-900 outline-none transition-all placeholder:text-gray-300";
  const labelClass = "block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Asset Name</label>
          <input 
            required
            placeholder="e.g. Savings Account, Main Portfolio"
            className={inputClass}
            value={values.name}
            onChange={e => setValues({...values, name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select 
              className={inputClass}
              value={values.type}
              onChange={e => setValues({...values, type: e.target.value as AssetType})}
            >
              {ASSET_TYPES.map(t => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select 
              className={inputClass}
              value={values.currency}
              onChange={e => setValues({...values, currency: e.target.value})}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Current Balance</label>
          <input 
            required
            type="number" 
            step="0.01"
            placeholder="0.00"
            className={`${inputClass} text-lg font-bold`}
            value={values.balance}
            onChange={e => setValues({...values, balance: e.target.value})}
          />
        </div>

        <div>
          <label className={labelClass}>Institution (Optional)</label>
          <input 
            placeholder="e.g. Chase, BDO, Vanguard"
            className={inputClass}
            value={values.institution}
            onChange={e => setValues({...values, institution: e.target.value})}
          />
        </div>

        <div>
          <label className={labelClass}>Notes (Optional)</label>
          <textarea 
            placeholder="Additional details..."
            className={`${inputClass} min-h-[80px] resize-none`}
            value={values.notes}
            onChange={e => setValues({...values, notes: e.target.value})}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-2xl text-sm font-black text-white bg-gray-900 shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? 'Saving...' : isEditing ? 'Update Asset' : 'Add Asset'}
      </button>
    </form>
  );
}

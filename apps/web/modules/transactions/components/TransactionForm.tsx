'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '~/lib/supabase/client';
import { EXPENSE_CATEGORIES, CURRENCIES } from '@stashflow/core';
import type { UnifiedTransaction, ExpenseCategory, IncomeFrequency } from '@stashflow/core';

interface TransactionFormProps {
  onSuccess?: () => void;
  initialData?: UnifiedTransaction;
}

export function TransactionForm({ onSuccess, initialData }: TransactionFormProps = {}) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type ?? 'expense');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState({
    amount: initialData ? String(initialData.amount) : '',
    currency: initialData?.currency ?? 'USD',
    description: initialData?.description ?? '',
    date: initialData?.date ?? new Date().toISOString().split('T')[0]!,
    category: (initialData?.category ?? EXPENSE_CATEGORIES[0] ?? 'other') as ExpenseCategory,
    frequency: 'one-time' as IncomeFrequency,
    isRecurring: false,
    notes: initialData?.notes ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    const amount = parseFloat(values.amount);
    if (isNaN(amount)) { setError('Invalid amount'); setLoading(false); return; }

    let dbError;
    if (isEditing && initialData) {
      const { error: updateError } = type === 'income'
        ? await supabase.from('incomes').update({
            amount,
            currency: values.currency,
            source: values.description,
            date: values.date,
            notes: values.notes || null,
          }).eq('id', initialData.id)
        : await supabase.from('expenses').update({
            amount,
            currency: values.currency,
            description: values.description,
            date: values.date,
            category: values.category,
            notes: values.notes || null,
          }).eq('id', initialData.id);
      dbError = updateError;
    } else {
      const { error: insertError } = type === 'income'
        ? await supabase.from('incomes').insert({
            user_id: user.id,
            amount,
            currency: values.currency,
            source: values.description,
            date: values.date,
            frequency: values.frequency,
            notes: values.notes || null,
          })
        : await supabase.from('expenses').insert({
            user_id: user.id,
            amount,
            currency: values.currency,
            description: values.description,
            date: values.date,
            category: values.category,
            is_recurring: values.isRecurring,
            notes: values.notes || null,
          });
      dbError = insertError;
    }
    const insertError = dbError;

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      if (onSuccess) {
        setValues({
          amount: '',
          currency: 'USD',
          description: '',
          date: new Date().toISOString().split('T')[0]!,
          category: (EXPENSE_CATEGORIES[0] || 'other') as ExpenseCategory,
          frequency: 'one-time' as IncomeFrequency,
          isRecurring: false,
          notes: '',
        });
        setType('expense');
        setError(null);
        setLoading(false);
        router.refresh();
        onSuccess();
      } else {
        router.push('/dashboard/transactions');
        router.refresh();
      }
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-gray-900 outline-none transition-all placeholder:text-gray-300";
  const labelClass = "block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-100 overflow-hidden">
        {/* Type Toggle */}
        <div className="flex p-2 bg-gray-50 border-b border-gray-100">
           {(['expense', 'income'] as const).map((t) => (
             <button
               key={t}
               type="button"
               onClick={() => !isEditing && setType(t)}
               disabled={isEditing}
               className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                 type === t
                   ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                   : 'text-gray-400 hover:text-gray-600'
               } ${isEditing ? 'cursor-default' : ''}`}
             >
               {t}
             </button>
           ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Amount</label>
              <div className="relative">
                <input 
                  required
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className={`${inputClass} text-2xl font-black ${type === 'income' ? 'text-green-600' : 'text-gray-900'}`}
                  value={values.amount}
                  onChange={e => setValues({...values, amount: e.target.value})}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <select 
                     className="bg-gray-100 border-none rounded-lg py-1 px-2 text-xs font-bold focus:ring-0"
                     value={values.currency}
                     onChange={e => setValues({...values, currency: e.target.value})}
                   >
                     {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>{type === 'income' ? 'Source' : 'Description'}</label>
              <input 
                required
                placeholder={type === 'income' ? 'Salary, Freelance, etc.' : 'Rent, Groceries, etc.'}
                className={inputClass}
                value={values.description}
                onChange={e => setValues({...values, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <input 
                  required
                  type="date"
                  className={inputClass}
                  value={values.date}
                  onChange={e => setValues({...values, date: e.target.value})}
                />
              </div>
              <div>
                {type === 'expense' ? (
                  <>
                    <label className={labelClass}>Category</label>
                    <select 
                      className={inputClass}
                      value={values.category}
                      onChange={e => setValues({...values, category: e.target.value as ExpenseCategory})}
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c} value={c} className="capitalize">{c}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <label className={labelClass}>Frequency</label>
                    <select 
                      className={inputClass}
                      value={values.frequency}
                      onChange={e => setValues({...values, frequency: e.target.value as IncomeFrequency})}
                    >
                      <option value="one-time">One-time</option>
                      <option value="monthly">Monthly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {type === 'expense' && (
              <label className="flex items-center gap-3 cursor-pointer group py-2">
                <input 
                  type="checkbox"
                  className="w-5 h-5 rounded-lg border-gray-200 text-gray-900 focus:ring-0 cursor-pointer"
                  checked={values.isRecurring}
                  onChange={e => setValues({...values, isRecurring: e.target.checked})}
                />
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Is this a recurring expense?</span>
              </label>
            )}

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

          <div className="flex gap-3">
             <button
               type="button"
               onClick={() => router.back()}
               className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={loading}
               className={`flex-[2] py-4 rounded-2xl text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                 type === 'income' ? 'bg-green-600 shadow-green-100 hover:bg-green-700' : 'bg-gray-900 shadow-gray-200 hover:bg-gray-800'
               }`}
             >
               {loading ? 'Saving...' : isEditing ? 'Update' : `Save ${type}`}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}

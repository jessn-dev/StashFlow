'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '~/lib/supabase/client';

export function DeleteAccountButton() {
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setStep('deleting');
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: session.user.id }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Delete failed');
      }

      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('confirm');
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="bg-red-50 text-red-600 border border-red-100 px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-red-700">
        This cannot be undone. All your data will be permanently deleted.
      </p>
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDelete}
          disabled={step === 'deleting'}
          className="bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {step === 'deleting' ? 'Deleting…' : 'Yes, delete my account'}
        </button>
        <button
          onClick={() => { setStep('idle'); setError(null); }}
          disabled={step === 'deleting'}
          className="px-5 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

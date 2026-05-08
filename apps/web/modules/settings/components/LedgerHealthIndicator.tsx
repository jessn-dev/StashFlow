'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

export function LedgerHealthIndicator() {
  const [status, setStatus] = useState<{ total: number; valid: number; invalid: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkIntegrity() {
      try {
        const supabase = createClient();
        const { data, error: functionError } = await supabase.functions.invoke('verify-ledger-integrity');

        if (functionError) throw functionError;
        setStatus(data);
      } catch (err) {
        console.error('Failed to verify ledger integrity:', err);
        setError('Verification failed');
      } finally {
        setLoading(false);
      }
    }

    checkIntegrity();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-1">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest">Verifying ledger integrity...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex items-center gap-2 text-red-500 py-1">
        <ShieldAlert className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Integrity check failed</span>
      </div>
    );
  }

  const isHealthy = status.invalid.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isHealthy ? (
          <ShieldCheck className="w-4 h-4 text-green-500" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-xs font-bold uppercase tracking-widest ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
          {isHealthy ? 'Ledger Secure' : 'Integrity Compromised'}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 font-medium leading-tight">
        {isHealthy 
          ? `Verified last ${status.total} transactions. HMAC-SHA256 signatures are valid.`
          : `Detected ${status.invalid.length} tampered or unsigned records out of ${status.total}.`}
      </p>
    </div>
  );
}

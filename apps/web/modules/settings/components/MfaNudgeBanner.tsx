'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ShieldAlert } from 'lucide-react';
import { createClient } from '~/lib/supabase/client';

export function MfaNudgeBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Default true until check

  useEffect(() => {
    // Check if user has already dismissed it in this session
    const isDismissed = sessionStorage.getItem('mfa-nudge-dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    const supabase = createClient();
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    
    if (error) {
      console.error('[MfaNudgeBanner] failed to check factors', error);
      return;
    }

    // If no verified TOTP factors, show the nudge
    const hasMfa = factors.totp.some(f => f.status === 'verified');
    if (!hasMfa) {
      setShow(true);
      setDismissed(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem('mfa-nudge-dismissed', 'true');
    setShow(false);
    setDismissed(true);
  };

  if (!show || dismissed) return null;

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-indigo-600 rounded-2xl p-4 shadow-xl shadow-indigo-100 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">Secure your financial data</p>
            <p className="text-xs opacity-90 font-medium">
              Enable Multi-Factor Authentication to add an extra layer of protection to your account.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/settings" 
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
          >
            Enable Now
          </Link>
          <button 
            onClick={dismiss}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

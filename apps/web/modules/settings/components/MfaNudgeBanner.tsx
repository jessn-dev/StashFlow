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
    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <ShieldAlert size={16} className="text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Enable MFA for extra account security.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/settings" 
            className="px-4 h-9 flex items-center bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
          >
            Enable MFA
          </Link>
          <button 
            onClick={dismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

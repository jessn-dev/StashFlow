'use client';

import { useState, useEffect } from 'react';
import { createClient } from '~/lib/supabase/client';

export function MfaManager() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      setError(error.message);
    } else {
      setMfaEnabled(data.currentLevel === 'aal2');
    }
    setLoading(false);
  };

  const startEnrollment = async () => {
    setError(null);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      setError(error.message);
      return;
    }

    setFactorId(data.id);
    setQrCodeUri(data.totp.qr_code);
    setIsEnrolling(true);
  };

  const verifyEnrollment = async () => {
    if (!factorId) return;
    setError(null);
    
    const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: data.id,
      code: verifyCode,
    });

    if (verifyError) {
      setError(verifyError.message);
    } else {
      setMfaEnabled(true);
      setIsEnrolling(false);
      setQrCodeUri(null);
      setVerifyCode('');
      // Refresh session level
      await supabase.auth.refreshSession();
    }
  };

  const unenroll = async () => {
    if (!globalThis.window?.confirm('Are you sure you want to disable Multi-Factor Authentication?')) return;
    
    setLoading(true);
    const { data: factors, error: fetchError } = await supabase.auth.mfa.listFactors();
    
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const totpFactor = factors.totp.find(f => f.status === 'verified');
    if (!totpFactor) {
      setError('No verified TOTP factor found.');
      setLoading(false);
      return;
    }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: totpFactor.id
    });

    if (unenrollError) {
      setError(unenrollError.message);
    } else {
      setMfaEnabled(false);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-sm text-gray-500 animate-pulse">Loading security settings...</div>;

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Multi-Factor Authentication (MFA)</h3>
          <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account.</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          mfaEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {mfaEnabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {!mfaEnabled && !isEnrolling && (
        <button
          onClick={startEnrollment}
          className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all"
        >
          Enable MFA
        </button>
      )}

      {isEnrolling && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            {qrCodeUri ? (
              <>
                <img src={qrCodeUri} alt="MFA QR Code" className="w-48 h-48 mb-4 shadow-sm" />
                <p className="text-xs text-center text-gray-500 max-w-xs">
                  Scan this code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">Generating QR code...</p>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Verification Code</label>
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-black tracking-[0.5em] text-center focus:border-gray-900 outline-none transition-all"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <div className="flex gap-3">
               <button
                 onClick={() => setIsEnrolling(false)}
                 className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={verifyEnrollment}
                 disabled={verifyCode.length !== 6}
                 className="flex-[2] bg-gray-900 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 disabled:opacity-50 transition-all"
               >
                 Verify and Activate
               </button>
            </div>
          </div>
        </div>
      )}

      {mfaEnabled && (
        <div className="space-y-4">
           <p className="text-sm text-gray-600 leading-relaxed">
             Multi-Factor Authentication is active. Your account is protected by an additional verification step.
           </p>
           <button
             onClick={unenroll}
             className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest"
           >
             Disable MFA
           </button>
        </div>
      )}
    </div>
  );
}

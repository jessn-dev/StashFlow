'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GoogleIcon } from '@/modules/auth/components/AuthIcons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if MFA is required
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aalError) {
      setError(aalError.message);
      setLoading(false);
      return;
    }

    if (aalData.nextLevel === 'aal2') {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        setError(factorsError.message);
        setLoading(false);
        return;
      }

      const enrolledFactors = factorsData.all.filter(factor => factor.status === 'verified');
      if (enrolledFactors.length > 0) {
        setMfaFactorId(enrolledFactors[0]!.id);
        setMfaRequired(true);
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    
    setLoading(true);
    setError('');
    const supabase = createClient();

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challengeData.id,
      code: mfaCode,
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: '#ebebeb',
        backgroundImage: 'radial-gradient(circle, #c8c8c8 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <img src="/logo-mark.svg" alt="StashFlow" className="w-16 h-16" />
        </div>

        {!mfaRequired ? (
          <>
            {/* Heading */}
            <h1 className="text-2xl font-bold text-center text-gray-900">Login</h1>
            <p className="text-sm text-gray-400 text-center mt-1 mb-6">Enter your details to login.</p>

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your Email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!email || !password || loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in…' : 'Log In'}
              </button>

              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}
            </form>

            {/* OR divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>

            {/* Sign up */}
            <p className="text-center text-sm text-gray-400 mt-5">
              Don&apos;t have an account yet?{' '}
              <Link href="/signup" className="text-gray-900 font-semibold underline underline-offset-2 hover:text-gray-600 transition-colors">
                Sign up
              </Link>
            </p>
          </>
        ) : (
          <>
            {/* MFA Challenge UI */}
            <h1 className="text-2xl font-bold text-center text-gray-900">Security Check</h1>
            <p className="text-sm text-gray-400 text-center mt-1 mb-6">Enter the 6-digit code from your authenticator app.</p>

            <form onSubmit={handleMfaVerify} className="space-y-6">
               <input
                type="text"
                placeholder="000000"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-2xl font-black tracking-[0.5em] text-center focus:border-gray-900 outline-none transition-all"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
              />

              <button
                type="submit"
                disabled={mfaCode.length !== 6 || loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying…' : 'Verify and Log In'}
              </button>

              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}

              <button
                type="button"
                onClick={() => setMfaRequired(false)}
                className="w-full text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
              >
                ← Back to Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

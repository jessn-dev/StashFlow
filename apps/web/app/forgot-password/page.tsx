'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '~/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/update-password`;
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: '#f5f5f5',
        backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="w-full max-w-[360px] bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="mb-6">
          <Link href="/login" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to sign in
          </Link>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-400 mb-6">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-4 text-sm text-emerald-700">
            Check your inbox — we sent a reset link to <strong>{email}</strong>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

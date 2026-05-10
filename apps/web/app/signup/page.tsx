'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '~/lib/supabase/client';
import { GoogleIcon, EyeIcon, EyeOffIcon } from '~/modules/auth';

type FieldError = { email?: string; password?: string; confirmPassword?: string; general?: string };

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const validate = (): FieldError => {
    const e: FieldError = {};
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); return; }

    setLoading(true);
    setErrors({});
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      const isEmailError = authError.message.toLowerCase().includes('email') || authError.message.toLowerCase().includes('already');
      setErrors(isEmailError ? { email: authError.message } : { general: authError.message });
      setLoading(false);
    } else {
      setSuccess(true);
      // No need for immediate redirect, let user see the success state
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrors({});
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (authError) {
      setErrors({ general: authError.message });
      setLoading(false);
    }
  };

  const canSubmit = name.trim() && email && password && confirmPassword && !loading;

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: '#ebebeb',
          backgroundImage: 'radial-gradient(circle, #c8c8c8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-[360px] text-center">
          <div className="flex justify-center mb-5">
            <img src="/logo-mark.svg" alt="StashFlow" className="w-16 h-16" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-sm text-gray-400">
            We sent a confirmation link to <span className="text-gray-700 font-medium">{email}</span>. Please click the link to activate your account.
          </p>
          <div className="mt-8">
            <Link 
              href="/login" 
              className="w-full inline-block py-2.5 rounded-lg text-sm font-semibold transition-colors bg-gray-900 text-white hover:bg-gray-700"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Heading */}
        <h1 className="text-2xl font-bold text-center text-gray-900">Sign Up</h1>
        <p className="text-sm text-gray-400 text-center mt-1 mb-6">Create your account to get started.</p>

        <form onSubmit={handleSignup} className="space-y-4" noValidate>
          {/* Full name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className={`block text-sm font-medium mb-1.5 ${errors.email ? 'text-red-500' : 'text-gray-700'}`}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: "" })); }}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors placeholder:text-gray-300 ${
                errors.email ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
              }`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className={`block text-sm font-medium mb-1.5 ${errors.password ? 'text-red-500' : 'text-gray-700'}`}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: "" })); }}
                className={`w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors placeholder:text-gray-300 ${
                  errors.password ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className={`block text-sm font-medium mb-1.5 ${errors.confirmPassword ? 'text-red-500' : 'text-gray-700'}`}
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: "" })); }}
                className={`w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors placeholder:text-gray-300 ${
                  errors.confirmPassword ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword}</p>}
          </div>

          {/* General error */}
          {errors.general && <p className="text-red-500 text-xs text-center">{errors.general}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
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

        {/* Log in link */}
        <p className="text-center text-sm text-gray-400 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-gray-900 font-semibold underline underline-offset-2 hover:text-gray-600 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

import Link from 'next/link'
import { login, signup } from './actions'

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ message?: string; mode?: string }>
}>) {
  const params = await searchParams
  const isSignUp = params?.mode === 'signup'

  return (
    <div className="flex min-h-screen w-full bg-brand-bg">
      {/* LEFT COLUMN: Auth Form */}
      <div className="flex w-full flex-col justify-center bg-brand-white px-8 py-12 md:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo / Branding */}
          <div className="mb-8 flex items-center gap-2 text-brand-primary">
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span className="text-xl font-bold">FinTrack</span>
          </div>

          {/* Dynamic Headings */}
          <h1 className="mb-2 text-3xl font-bold text-brand-primary">
            {isSignUp ? 'Create an Account' : 'Welcome Back!'}
          </h1>
          <p className="mb-8 text-sm text-brand-text">
            {isSignUp
              ? 'Sign up to start tracking your net worth and optimizing your finances.'
              : 'Sign in to access your dashboard and continue optimizing your financial process.'}
          </p>

          <form className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text font-medium text-brand-text">Email</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                className="input input-bordered w-full focus:border-brand-accent focus:outline-none"
                required
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text font-medium text-brand-text">Password</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="input input-bordered w-full focus:border-brand-accent focus:outline-none"
                required
              />

              {/* Only show Forgot Password on the Sign In view */}
              {!isSignUp && (
                <label className="label justify-end">
                  <Link href="/forgot-password" data-testid="forgot-password-link" className="label-text-alt font-medium text-brand-accent hover:underline">
                    Forgot Password?
                  </Link>
                </label>
              )}
            </div>

            {params?.message && (
              <p className="rounded-md bg-error/20 p-3 text-center text-sm text-error">
                {params.message}
              </p>
            )}

            {/* Dynamic Form Action */}
            <button
              formAction={isSignUp ? signup : login}
              className="btn btn-primary mt-2 w-full border-none bg-brand-primary text-white hover:bg-brand-primary/90"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="divider text-xs text-brand-text/60">OR</div>

          <div className="flex flex-col gap-3">
            <button className="btn btn-outline w-full border-gray-300 text-brand-text hover:bg-gray-50 hover:text-brand-primary">
              <svg className="h-5 w-5 mr-2 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <button className="btn btn-outline w-full border-gray-300 text-brand-text hover:bg-gray-50 hover:text-brand-primary">
              <svg className="h-5 w-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.67 2.14-3.4 1.93-2.85 6.35.6 7.6-1.04 1.4-2.11 2.38-2.92 3.27zm-2.45-14.7c.47-1.39-.08-2.88-1.12-3.83-1.16-.95-2.73-1.1-3.15.28-.5 1.48.06 2.96 1.14 3.84 1.12.87 2.62 1.05 3.13-.29z" />
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Dynamic Bottom Link */}
          <div className="mt-8 text-center text-sm text-brand-text">
            {isSignUp ? 'Already have an account? ' : "Don&apos;t have an Account? "}
            <Link
              href={isSignUp ? '/login' : '/login?mode=signup'}
              className="font-bold text-brand-accent hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-brand-bg p-12 text-brand-primary md:flex lg:p-24 overflow-hidden border-l border-brand-primary/10">

        {/* Subtle Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage: 'linear-gradient(rgba(13,61,61,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,61,61,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        ></div>

        <div className="relative z-10 pt-8">
          {/* Eyebrow */}
          <div className="text-xs lg:text-sm font-mono tracking-[0.3em] uppercase text-brand-accent mb-8 flex items-center gap-4">
            <div className="w-10 h-[1px] bg-brand-accent"></div>
            Revolutionize Finance
          </div>

          {/* Headline */}
          <h1 className="font-serif text-6xl xl:text-[7rem] font-black leading-[0.95] text-brand-primary">
            Smarter<br />
            <em className="italic text-brand-accent font-light">Tracking.</em><br />
            Total<br />
            Clarity.
          </h1>

          {/* Subtext */}
          <p className="text-base xl:text-lg text-brand-text/80 max-w-[42ch] leading-relaxed mt-10">
            The financial intelligence layer that transforms raw data into decisive insight. Built for teams that can&apos;t afford ambiguity.
          </p>
        </div>

        {/* Footer Logos */}
        <div className="relative z-10 mt-16">
          <p className="mb-4 text-xs font-bold tracking-widest text-brand-text/50 uppercase">
            Can be connected to
          </p>
          <div className="flex flex-wrap gap-8 text-brand-primary/40">
            <span className="font-bold text-lg">Stripe</span>
            <span className="font-bold text-lg">Plaid</span>
            <span className="font-bold text-lg">Square</span>
            <span className="font-bold text-lg">Coinbase</span>
          </div>
        </div>
      </div>
    </div>
  )
}
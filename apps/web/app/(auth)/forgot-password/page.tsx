import Link from 'next/link'
import { forgotPassword } from '../login/actions'

export default async function ForgotPasswordPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ message?: string }>
}>) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full bg-brand-bg">
      <div className="flex w-full flex-col justify-center bg-brand-white px-8 py-12 md:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 text-brand-primary">
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span className="text-xl font-bold">FinTrack</span>
          </div>

          <h1 className="mb-2 text-3xl font-bold text-brand-primary">Reset Password</h1>
          <p className="mb-8 text-sm text-brand-text">
            Enter your email address and we&apos;ll send you a link to reset your password.
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

            {params?.message && (
              <p className="rounded-md bg-info/20 p-3 text-center text-sm text-brand-primary">
                {params.message}
              </p>
            )}

            <button
              formAction={forgotPassword}
              className="btn btn-primary mt-2 w-full border-none bg-brand-primary text-white hover:bg-brand-primary/90"
            >
              Send Reset Link
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-brand-text">
            Remembered your password?{' '}
            <Link href="/login" className="font-bold text-brand-accent hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden w-1/2 flex-col justify-between bg-brand-bg p-12 text-brand-primary md:flex lg:p-24 overflow-hidden border-l border-brand-primary/10">
        <div className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage: 'linear-gradient(rgba(13,61,61,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,61,61,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}></div>
        <div className="relative z-10 pt-8">
          <div className="text-xs lg:text-sm font-mono tracking-[0.3em] uppercase text-brand-accent mb-8 flex items-center gap-4">
            <div className="w-10 h-[1px] bg-brand-accent"></div>
            Revolutionize Finance
          </div>
          <h1 className="font-serif text-6xl xl:text-[7rem] font-black leading-[0.95] text-brand-primary">
            Smarter<br />
            <em className="italic text-brand-accent font-light">Tracking.</em><br />
            Total<br />
            Clarity.
          </h1>
        </div>
      </div>
    </div>
  )
}

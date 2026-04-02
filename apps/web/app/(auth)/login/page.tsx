import { login, signup } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  // In Next.js 15, searchParams is an asynchronous promise
  searchParams: Promise<{ message: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center min-h-screen mx-auto">
      <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
        <h1 className="text-3xl font-bold mb-6 text-center">FinTrack</h1>

        <label className="text-md font-medium" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-4"
          name="email"
          placeholder="you@example.com"
          required
        />

        <label className="text-md font-medium" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />

        <button
          formAction={login}
          className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium mb-2 hover:bg-blue-700 transition-colors"
        >
          Sign In
        </button>
        <button
          formAction={signup}
          className="border border-gray-300 rounded-md px-4 py-2 font-medium mb-2 hover:bg-gray-50 transition-colors"
        >
          Sign Up
        </button>

        {params?.message && (
          <p className="mt-4 p-4 bg-red-100 text-red-800 text-center rounded-md text-sm">
            {params.message}
          </p>
        )}
      </form>
    </div>
  )
}
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-5xl font-bold mb-6">Welcome to FinTrack</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl">
        Take control of your personal finances, track your spending, and manage your loans all in one place.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          Go to App
        </Link>
      </div>
    </div>
  )
}
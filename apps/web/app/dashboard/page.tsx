import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch user securely on the server side to protect the route
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Navbar */}
      <nav className="border-b border-brand-primary/10 bg-white px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-2 font-serif text-2xl font-bold text-brand-primary">
          <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
          FinTrack
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-mono text-brand-text/70">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-xs font-bold tracking-widest uppercase text-brand-accent hover:text-brand-primary transition-colors">
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-8 py-12">
        <h1 className="font-serif text-4xl font-bold text-brand-primary mb-10">Overview</h1>

        {/* Wealth Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 border border-brand-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-mono tracking-widest text-brand-text/60 uppercase mb-3">Net Worth</div>
            <div className="font-serif text-5xl font-bold text-brand-primary">$0.00</div>
            <div className="text-xs font-mono text-brand-accent mt-4">Connect accounts to begin</div>
          </div>

          <div className="bg-white p-8 border border-brand-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-mono tracking-widest text-brand-text/60 uppercase mb-3">Total Assets</div>
            <div className="font-serif text-4xl font-bold text-brand-primary">$0.00</div>
          </div>

          <div className="bg-white p-8 border border-brand-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-mono tracking-widest text-brand-text/60 uppercase mb-3">Total Liabilities</div>
            <div className="font-serif text-4xl font-bold text-brand-text/80">$0.00</div>
          </div>
        </div>

        {/* Recent Transactions Module */}
        <div className="bg-white border border-brand-primary/10 shadow-sm">
          <div className="p-8 border-b border-brand-primary/10">
            <h2 className="font-serif text-2xl font-bold text-brand-primary">Recent Transactions</h2>
          </div>
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mb-4 text-brand-accent border border-brand-primary/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="font-bold text-brand-primary text-lg mb-2">No data available</h3>
            <p className="text-sm text-brand-text/60 max-w-sm mb-6">You haven't added any transactions yet. Start tracking your expenses to see your insights here.</p>
            <button className="bg-brand-primary text-white text-xs font-bold tracking-widest uppercase px-6 py-3 hover:bg-brand-primary/90 transition-colors">
              Add Transaction
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
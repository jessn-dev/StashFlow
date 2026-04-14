import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getDashboardSummary, getRecentTransactions } from '@fintrack/api'
import { formatCurrency } from '@fintrack/core'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch user securely on the server side to protect the route
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch Dashboard Data
  const summary = await getDashboardSummary(supabase)
  const transactions = await getRecentTransactions(supabase)

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Navbar */}
      <nav className="border-b border-brand-primary/10 bg-white px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-2 font-serif text-2xl font-bold text-brand-primary">
          <span className="w-2 h-2 rounded-full bg-brand-accent"></span>{' '}
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
            <div className="font-serif text-5xl font-bold text-brand-primary">
              {formatCurrency(summary.netWorth)}
            </div>
            <div className="text-xs font-mono text-brand-accent mt-4">
              {summary.netWorth === 0 ? 'Connect accounts to begin' : 'Your total financial value'}
            </div>
          </div>

          <div className="bg-white p-8 border border-brand-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-mono tracking-widest text-brand-text/60 uppercase mb-3">Total Assets</div>
            <div className="font-serif text-4xl font-bold text-brand-primary">
              {formatCurrency(summary.totalAssets)}
            </div>
          </div>

          <div className="bg-white p-8 border border-brand-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-mono tracking-widest text-brand-text/60 uppercase mb-3">Total Liabilities</div>
            <div className="font-serif text-4xl font-bold text-brand-text/80">
              {formatCurrency(summary.totalLiabilities)}
            </div>
          </div>
        </div>

        {/* Recent Transactions Module */}
        <div className="bg-white border border-brand-primary/10 shadow-sm">
          <div className="p-8 border-b border-brand-primary/10">
            <h2 className="font-serif text-2xl font-bold text-brand-primary">Recent Transactions</h2>
          </div>
          
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="text-xs font-mono tracking-widest text-brand-text/50 uppercase border-b border-brand-primary/5">
                    <th className="bg-white py-6 px-8">Date</th>
                    <th className="bg-white py-6 px-8">Description / Source</th>
                    <th className="bg-white py-6 px-8">Type</th>
                    <th className="bg-white py-6 px-8 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-brand-bg/30 transition-colors border-b border-brand-primary/5 last:border-0">
                      <td className="py-5 px-8 text-sm font-mono text-brand-text/70">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="py-5 px-8">
                        <div className="font-bold text-brand-primary">
                          {tx.type === 'income' ? tx.source : tx.description}
                        </div>
                        <div className="text-xs text-brand-text/50 capitalize">
                          {tx.type === 'income' ? 'Income' : tx.category}
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded ${
                          tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-5 px-8 text-right font-serif font-bold ${
                        tx.type === 'income' ? 'text-brand-accent' : 'text-brand-text'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-8 border-t border-brand-primary/5 text-center">
                <button className="text-xs font-bold tracking-widest uppercase text-brand-accent hover:text-brand-primary transition-colors">
                  View All Transactions
                </button>
              </div>
            </div>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mb-4 text-brand-accent border border-brand-primary/10">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="font-bold text-brand-primary text-lg mb-2">No data available</h3>
              <p className="text-sm text-brand-text/60 max-w-sm mb-6">You haven&apos;t added any transactions yet. Start tracking your expenses to see your insights here.</p>
              <button className="bg-brand-primary text-white text-xs font-bold tracking-widest uppercase px-6 py-3 hover:bg-brand-primary/90 transition-colors">
                Add Transaction
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getExpenses, getExpensesByCategory } from '@fintrack/api'
import ExpenseForm from '@/components/spending/ExpenseForm'
import ExpenseList from '@/components/spending/ExpenseList'
import CategoryBreakdown from '@/components/spending/CategoryBreakdown'
import Link from 'next/link'

export default async function SpendingPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  const [expenses, breakdown] = await Promise.all([
    getExpenses(supabase),
    getExpensesByCategory(supabase)
  ])

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Navbar */}
      <nav className="border-b border-brand-primary/10 bg-white px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-2 font-serif text-2xl font-bold text-brand-primary">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-accent"></span>{' '}
            FinTrack
          </Link>
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
        <div className="flex justify-between items-end mb-10">
          <div>
            <Link href="/dashboard" className="text-xs font-bold tracking-widest uppercase text-brand-accent hover:text-brand-primary mb-2 block">
              ← Back to Overview
            </Link>
            <h1 className="font-serif text-4xl font-bold text-brand-primary">Spending</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form & History */}
          <div className="lg:col-span-2 space-y-8">
            <ExpenseForm />
            <ExpenseList expenses={expenses} />
          </div>

          {/* Right Column: Breakdown */}
          <div className="space-y-8">
            <CategoryBreakdown data={breakdown} />
            
            {/* Quick Tips Card */}
            <div className="bg-brand-primary p-8 text-white">
              <h3 className="font-serif text-xl font-bold mb-4">Financial Tip</h3>
              <p className="text-sm font-mono opacity-80 leading-relaxed">
                Try to keep your 'Other' category below 10% of your total spending. 
                Detailed categorization leads to better financial clarity and easier budgeting.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

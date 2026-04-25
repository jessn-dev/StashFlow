import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Income', href: '/dashboard/income' },
    { label: 'Spending', href: '/dashboard/spending' },
    { label: 'Loans', href: '/dashboard/loans' },
    { label: 'Budgets', href: '/dashboard/budgets' },
    { label: 'Goals', href: '/dashboard/goals' },
    { label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-black">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-brand-primary">StashFlow</h2>
        </div>
        <nav className="mt-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-6 py-3 text-sm font-medium hover:bg-gray-100 border-l-4 border-transparent hover:border-brand-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <form action="/auth/signout" method="post">
               <button className="text-sm text-red-600 font-medium">Sign out</button>
            </form>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

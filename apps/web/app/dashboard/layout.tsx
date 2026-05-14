import { redirect } from 'next/navigation';
import { createClient } from '~/lib/supabase/server';
import { getUser } from '@stashflow/auth';
import { SidebarNav } from '~/modules/dashboard/components/SidebarNav';
import { MfaNudgeBanner } from '~/modules/settings/components/MfaNudgeBanner';

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) redirect('/login');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Global Top Navigation — 72px */}
      <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center justify-between h-full px-6">
          <span className="text-lg font-black tracking-tight text-gray-900">StashFlow</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden md:block">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — 240px */}
        <aside className="w-60 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col">
          <SidebarNav />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <MfaNudgeBanner />
          <div className="max-w-[1320px] mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

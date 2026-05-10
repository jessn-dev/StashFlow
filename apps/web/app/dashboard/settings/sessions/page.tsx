import { SessionList } from '~/modules/settings/components/SessionList';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function SessionsPage() {
  return (
    <div className="space-y-10 max-w-2xl">
      <div className="space-y-4">
        <Link 
          href="/dashboard/settings" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Active Sessions</h1>
          <p className="text-gray-400 font-medium mt-1">
            Monitor and manage devices that are currently logged into your account.
          </p>
        </div>
      </div>

      <SessionList />
    </div>
  );
}

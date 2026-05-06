import { createClient } from '@/lib/supabase/server';
import { ProfileQuery } from '@stashflow/api';
import { MfaManager } from '@/modules/settings/components/MfaManager';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const profileQuery = new ProfileQuery(supabase);
  const profile = await profileQuery.get(user.id);

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-400 font-medium mt-1">Manage your profile and security preferences.</p>
      </div>
      
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 ml-1">Profile</h2>
        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
            <p className="text-gray-900 font-semibold">{user.email}</p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
            <p className="text-gray-900 font-semibold">{profile?.full_name || 'Not set'}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Preferred Currency</label>
            <p className="text-gray-900 font-black">{profile?.preferred_currency || 'USD'}</p>
          </div>

          <div className="pt-2">
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              Edit Profile →
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 ml-1">Security</h2>
        <MfaManager />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-red-400 ml-1">Danger Zone</h2>
        <div className="p-6 bg-white rounded-2xl border border-red-50 shadow-sm space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            Once you delete your account, there is no going back. All your financial data, documents, and settings will be permanently erased.
          </p>
          <button className="bg-red-50 text-red-600 border border-red-100 px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-100 transition-all">
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}

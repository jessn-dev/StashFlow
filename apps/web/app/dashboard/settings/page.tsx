import { createClient } from '@/lib/supabase/server';
import { ProfileQuery } from '@stashflow/api';
import { MfaManager } from '@/modules/settings/components/MfaManager';
import { ProfileEditForm } from '@/modules/settings/components/ProfileEditForm';
import { DeleteAccountButton } from '@/modules/settings/components/DeleteAccountButton';

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
          
          <ProfileEditForm profile={profile} userId={user.id} />
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
          <DeleteAccountButton />
        </div>
      </section>
    </div>
  );
}

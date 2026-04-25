import { createClient } from '@/lib/supabase/server';
import { ProfileQuery } from '@stashflow/api';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const profileQuery = new ProfileQuery(supabase);
  const profile = await profileQuery.get(user.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold">Account Settings</h2>
      
      <div className="p-6 bg-white rounded-xl border shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <p className="mt-1 text-gray-900">{user.email}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <p className="mt-1 text-gray-900">{profile?.full_name || 'Not set'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Preferred Currency</label>
          <p className="mt-1 text-gray-900 font-bold">{profile?.preferred_currency || 'USD'}</p>
        </div>

        <div className="pt-4">
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
            Edit Profile
          </button>
        </div>
      </div>

      <div className="p-6 bg-white rounded-xl border shadow-sm space-y-4">
        <h3 className="font-semibold text-red-600">Danger Zone</h3>
        <p className="text-sm text-gray-500">Once you delete your account, there is no going back. Please be certain.</p>
        <button className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium">
          Delete Account
        </button>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getProfile } from '@stashflow/api'
import SettingsUI from './SettingsUI'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const profile = await getProfile(supabase)

  return (
    <SettingsUI 
      profile={profile}
      userEmail={user.email || ''}
    />
  )
}

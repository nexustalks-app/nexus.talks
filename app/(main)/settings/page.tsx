import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { SettingsView } from '@/components/settings/settings-view';

export const metadata = {
  title: 'Settings — Nexus.talks',
  description: 'Manage your preferences, appearance, accessibility, and account security.',
};

export default async function SettingsPage() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, avatar_url, bio, status, last_seen_at, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <SettingsView
      user={{
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      }}
      profile={profile}
    />
  );
}

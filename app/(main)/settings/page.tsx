import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getUserProfile } from '@/lib/supabase/server';
import { SettingsView } from '@/components/settings/settings-view';

export const metadata = {
  title: 'Settings — Nexus.talks',
  description: 'Manage your preferences, appearance, accessibility, and account security.',
};

export default async function SettingsPage() {
  const { user } = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile(user.id);

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

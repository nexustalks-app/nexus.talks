import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getUserProfile } from '@/lib/supabase/server';
import { ProfilePageClient } from '@/components/profile/profile-page-client';

export const metadata = {
  title: 'My Profile — Nexus.talks',
  description: 'View and manage your Nexus profile.',
};

export default async function ProfilePage() {
  const { user } = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile(user.id);

  return <ProfilePageClient initialProfile={profile} user={user} />;
}

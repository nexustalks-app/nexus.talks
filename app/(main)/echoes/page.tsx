import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { EchoesView } from '@/components/echoes/echoes-view';

export const metadata = {
  title: 'Echoes — Nexus.talks',
  description: 'Your personal bookmarks, captured conversation moments, and private notes.',
};

export default async function EchoesPage() {
  const { user } = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return <EchoesView currentUserId={user.id} />;
}

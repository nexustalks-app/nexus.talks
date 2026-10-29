import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { PulseView } from '@/components/pulse/pulse-view';

export const metadata = {
  title: 'Pulse — Nexus.talks',
  description: 'Recent conversation activity, unread summaries, and direct return to chat.',
};

export default async function PulsePage() {
  const { user } = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return <PulseView currentUserId={user.id} />;
}

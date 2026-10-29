import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { ConversationsShell } from '@/components/conversation/conversations-shell';

export default async function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuthenticatedUser();

  if (!user) redirect('/login');

  return (
    <ConversationsShell currentUserId={user.id}>
      {children}
    </ConversationsShell>
  );
}

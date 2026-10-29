import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let profile = existingProfile;
  if (!profile) {
    const defaultUsername = user.user_metadata?.username || `user_${user.id.slice(0, 8)}`;
    const defaultDisplayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    const { data: createdProfile } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: defaultUsername,
        display_name: defaultDisplayName,
        status: 'online',
        last_seen_at: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();
    if (createdProfile) {
      profile = createdProfile;
    }
  }

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden text-charcoal dark:text-foreground md:flex-row nx-ambient-shell"
    >
      <Sidebar user={user} profile={profile} />
      <main
        className="min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        {children}
      </main>
    </div>
  );
}

import { getAuthenticatedUser } from '@/lib/supabase/server';
import { PeopleList } from '@/components/user/people-list';

export default async function PeoplePage() {
  const { user } = await getAuthenticatedUser();

  // The layout already redirects if not authenticated,
  // but we keep this guard for type safety.
  if (!user) return null;

  return <PeopleList currentUserId={user.id} />;
}

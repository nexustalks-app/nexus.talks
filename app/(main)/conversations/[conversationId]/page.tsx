import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConversationView } from '@/components/conversation/conversation-view';
import type { MessageWithReactions } from '@/components/conversation/message-item';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return notFound();

  // 2. Fetch conversation, members with joined profiles, and messages simultaneously in PARALLEL
  const [conversationResult, membersResult, messagesResult] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, type, created_at, name')
      .eq('id', conversationId)
      .maybeSingle(),
    supabase
      .from('conversation_members')
      .select(`
        user_id,
        is_muted,
        profiles (
          id,
          display_name,
          username,
          avatar_url,
          status,
          bio,
          last_seen_at,
          created_at
        )
      `)
      .eq('conversation_id', conversationId),
    supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        type,
        reply_to_id,
        created_at,
        edited_at,
        deleted_at,
        reply_to:reply_to_id (
          id,
          content,
          sender_id,
          deleted_at
        ),
        message_reactions (
          id,
          message_id,
          user_id,
          emoji,
          created_at
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50),
  ]);

  // If conversation does not exist or user doesn't have permission
  if (conversationResult.error) {
    throw new Error(`Failed to load conversation: ${conversationResult.error.message}`);
  }
  if (!conversationResult.data) {
    return notFound();
  }

  // If database error querying members, throw to trigger error.tsx with a Retry button
  if (membersResult.error) {
    throw new Error(`Failed to load conversation members: ${membersResult.error.message}`);
  }

  const allMembers = membersResult.data || [];
  const isMember = allMembers.some((m) => m.user_id === user.id);
  if (!isMember) {
    return notFound();
  }

  // Find the other user in the conversation (for direct message)
  const otherMember = allMembers.find((m) => m.user_id !== user.id) || allMembers[0];
  const participantProfile = (otherMember?.profiles as unknown) as {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    status: string | null;
    bio: string | null;
    last_seen_at: string | null;
    created_at: string;
  } | null;

  // Participant fallback if profile is missing
  const participant = {
    id: participantProfile?.id ?? otherMember?.user_id ?? 'unknown',
    displayName: participantProfile?.display_name ?? 'Member',
    username: participantProfile?.username ?? 'member',
    avatarUrl: participantProfile?.avatar_url ?? null,
    status: (participantProfile?.status ?? 'offline') as 'online' | 'away' | 'offline',
    bio: participantProfile?.bio ?? null,
    lastSeenAt: participantProfile?.last_seen_at ?? null,
    createdAt: participantProfile?.created_at ?? new Date().toISOString(),
  };

  // Log messages error if any, without blocking conversation view
  if (messagesResult.error) {
    console.error('[ConversationPage] Error loading messages:', messagesResult.error.message);
  }

  // Reverse descending results so initialMessages are in chronological order (oldest -> newest)
  const initialMessages = ((messagesResult.data as unknown as MessageWithReactions[]) || []).slice().reverse();

  const currentUserMembership = allMembers.find((m) => m.user_id === user.id);

  return (
    <ConversationView
      key={conversationId}
      conversationId={conversationId}
      currentUserId={user.id}
      initialMessages={initialMessages}
      participant={participant}
      conversation={{
        id: conversationResult.data.id,
        type: (conversationResult.data.type as 'direct' | 'group') || 'direct',
        createdAt: conversationResult.data.created_at,
        name: conversationResult.data.name,
      }}
      isMuted={Boolean(currentUserMembership?.is_muted)}
    />
  );
}

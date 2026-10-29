import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PulseData, PulseConversationSummary, PulseActivityItem } from '@/types/pulse';

/**
 * GET /api/pulse
 * Returns honest, privacy-conscious activity data for the authenticated user.
 * Zero fake engagement counters or synthetic active users.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user's conversation memberships
    const { data: userMemberships, error: memberError } = await supabase
      .from('conversation_members')
      .select(`
        conversation_id,
        unread_count,
        is_muted,
        last_read_at
      `)
      .eq('user_id', user.id);

    if (memberError) {
      console.error('Error fetching memberships for pulse:', memberError);
      return NextResponse.json({ error: 'Failed to fetch pulse data' }, { status: 500 });
    }

    if (!userMemberships || userMemberships.length === 0) {
      const emptyPulse: PulseData = {
        totalUnreadCount: 0,
        activeConversationsCount: 0,
        recentConversations: [],
        recentActivity: [],
      };
      return NextResponse.json(emptyPulse);
    }

    const conversationIds = userMemberships.map((m) => m.conversation_id);

    // 2. Fetch conversation details & all other members to get participant names
    const [convsRes, allMembersRes, recentMessagesRes] = await Promise.all([
      supabase
        .from('conversations')
        .select('id, type, name, avatar_url, last_message_id, last_message_at')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          user_id,
          profiles (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .in('conversation_id', conversationIds),
      supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          deleted_at,
          profiles:sender_id (
            display_name,
            avatar_url
          )
        `)
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const conversations = convsRes.data || [];
    const allMembers = allMembersRes.data || [];
    const recentMessages = recentMessagesRes.data || [];

    // Map memberships by conversation_id
    const memberMap = new Map(userMemberships.map((m) => [m.conversation_id, m]));

    // Map other participants by conversation_id
    const otherParticipantMap = new Map<string, { displayName: string; avatarUrl: string | null }>();
    for (const row of allMembers) {
      if (row.user_id !== user.id && row.profiles) {
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        if (p) {
          otherParticipantMap.set(row.conversation_id, {
            displayName: p.display_name || p.username || 'Nexus Member',
            avatarUrl: p.avatar_url,
          });
        }
      }
    }

    // Map latest messages by conversation_id
    const latestMessageMap = new Map<string, any>();
    for (const msg of recentMessages) {
      if (!latestMessageMap.has(msg.conversation_id)) {
        latestMessageMap.set(msg.conversation_id, msg);
      }
    }

    let totalUnreadCount = 0;
    const recentConversations: PulseConversationSummary[] = [];

    for (const conv of conversations) {
      const membership = memberMap.get(conv.id);
      const other = otherParticipantMap.get(conv.id);
      const latestMsg = latestMessageMap.get(conv.id);

      const unreadCount = membership?.unread_count || 0;
      totalUnreadCount += unreadCount;

      const conversationName =
        conv.type === 'group'
          ? conv.name || 'Group Conversation'
          : other?.displayName || conv.name || 'Conversation';

      const avatarUrl = conv.type === 'group' ? conv.avatar_url : (other?.avatarUrl || null);

      const senderProfile = latestMsg?.profiles
        ? Array.isArray(latestMsg.profiles)
          ? latestMsg.profiles[0]
          : latestMsg.profiles
        : null;

      const lastSenderName = latestMsg
        ? latestMsg.sender_id === user.id
          ? 'You'
          : senderProfile?.display_name || 'Participant'
        : null;

      const lastMessageSnippet = latestMsg
        ? latestMsg.deleted_at
          ? 'Message was deleted'
          : latestMsg.content.slice(0, 75)
        : null;

      recentConversations.push({
        id: conv.id,
        name: conversationName,
        type: conv.type,
        avatarUrl,
        unreadCount,
        lastMessageSnippet,
        lastMessageAt: conv.last_message_at || latestMsg?.created_at || null,
        lastSenderName,
        isMuted: Boolean(membership?.is_muted),
      });
    }

    // Build recentActivity timeline (from recent messages)
    const recentActivity: PulseActivityItem[] = recentMessages.slice(0, 10).map((msg) => {
      const conv = conversations.find((c) => c.id === msg.conversation_id);
      const other = otherParticipantMap.get(msg.conversation_id);
      const convName =
        conv?.type === 'group'
          ? conv.name || 'Group Conversation'
          : other?.displayName || 'Direct Chat';

      const senderProfile = msg.profiles
        ? Array.isArray(msg.profiles)
          ? msg.profiles[0]
          : msg.profiles
        : null;

      const senderName =
        msg.sender_id === user.id ? 'You' : senderProfile?.display_name || 'Participant';

      const membership = memberMap.get(msg.conversation_id);
      const isUnread = Boolean(
        membership?.last_read_at &&
          new Date(msg.created_at).getTime() > new Date(membership.last_read_at).getTime() &&
          msg.sender_id !== user.id
      );

      return {
        id: msg.id,
        conversationId: msg.conversation_id,
        conversationName: convName,
        senderName,
        senderAvatar: senderProfile?.avatar_url || null,
        actionSnippet: msg.deleted_at ? 'Message deleted' : msg.content.slice(0, 60),
        timestamp: msg.created_at,
        isUnread,
      };
    });

    const responseData: PulseData = {
      totalUnreadCount,
      activeConversationsCount: conversations.length,
      recentConversations,
      recentActivity,
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error('GET /api/pulse unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

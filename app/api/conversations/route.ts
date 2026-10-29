import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConversationSchema } from '@/lib/validations/conversation';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * POST /api/conversations
 * Creates a 1-to-1 conversation between the current user and a participant,
 * or returns the existing conversation if one already exists.
 *
 * This runs server-side with the anon key (not service role),
 * so all RLS policies are still enforced.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate Limit (30 conversation creation requests per minute per user)
    const rateLimit = checkRateLimit(`conv_create:${user.id}`, {
      maxRequests: 30,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Too many conversation requests. Please wait a moment.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(rateLimit.resetSeconds));
      return response;
    }

    // 3. Validate input with safe JSON parsing
    const body = await request.json().catch(() => null);
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

  const participantId = parsed.data.participant_id;

  // 3. Prevent self-conversation
  if (participantId === user.id) {
    return NextResponse.json(
      { error: 'Cannot create a conversation with yourself' },
      { status: 400 }
    );
  }

  // 4. Verify the participant exists in profiles
  const { data: participant, error: participantError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, status, username')
    .eq('id', participantId)
    .single();

  if (participantError || !participant) {
    return NextResponse.json(
      { error: 'Participant not found' },
      { status: 404 }
    );
  }

  // 5. Find existing direct conversation between these two users
  //    Step 1: Get all conversation_ids the current user belongs to
  const { data: myMemberships } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (myMemberships && myMemberships.length > 0) {
    const myConversationIds = myMemberships.map((m) => m.conversation_id);

    //    Step 2: Check which of those the participant also belongs to
    const { data: sharedMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .in('conversation_id', myConversationIds)
      .eq('user_id', participantId);

    if (sharedMemberships && sharedMemberships.length > 0) {
      const sharedIds = sharedMemberships.map((m) => m.conversation_id);

      //    Step 3: Filter to direct conversations only, ordered deterministically by most recent activity
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('id, last_message_at, created_at')
        .eq('type', 'direct')
        .in('id', sharedIds)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      // Found an existing conversation — return the most recent/active one
      if (existingConversations && existingConversations.length > 0) {
        return NextResponse.json({
          conversation_id: existingConversations[0].id,
          participant: {
            id: participant.id,
            display_name: participant.display_name,
            username: participant.username,
            avatar_url: participant.avatar_url,
            status: participant.status,
          },
        });
      }
    }
  }

  // 6. Create a new direct conversation
  //    We generate the UUID ourselves instead of relying on RETURNING,
  //    because the conversations SELECT policy requires membership to
  //    read the row back — and we haven't added members yet.
  const conversationId = crypto.randomUUID();

  const { error: convError } = await supabase
    .from('conversations')
    .insert({ id: conversationId, type: 'direct' });

  if (convError) {
    console.error('[conversations] Insert conversation failed:', convError);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }

  // 7. Add the current user as a member first.
  //    This passes the RLS check because user_id = auth.uid().
  const { error: selfMemberError } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: conversationId, user_id: user.id });

  if (selfMemberError) {
    console.error('[conversations] Insert self member failed:', selfMemberError);
    return NextResponse.json(
      { error: 'Failed to add you to the conversation' },
      { status: 500 }
    );
  }

  // 8. Add the other user as a member.
  //    This passes the RLS check because the current user is now a member
  //    (the EXISTS subquery in conversation_members_insert finds them).
  //    We insert separately (not batch) to ensure the first row is
  //    visible to the second row's RLS check.
  const { error: otherMemberError } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: conversationId, user_id: participantId });

  if (otherMemberError) {
    console.error('[conversations] Insert other member failed:', otherMemberError);
    return NextResponse.json(
      { error: 'Failed to add participant to the conversation' },
      { status: 500 }
    );
  }

  // 9. Return the new conversation
  return NextResponse.json({
    conversation_id: conversationId,
    participant: {
      id: participant.id,
      display_name: participant.display_name,
      username: participant.username,
      avatar_url: participant.avatar_url,
      status: participant.status,
    },
  });
  } catch (err) {
    console.error('[conversations] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred' },
      { status: 500 }
    );
  }
}

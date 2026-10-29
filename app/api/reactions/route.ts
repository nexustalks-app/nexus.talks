import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';

const reactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limit (120 reaction toggles per minute per user)
    const rateLimit = checkRateLimit(`reactions:${user.id}`, {
      maxRequests: 120,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Too many reactions. Please wait a moment.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(rateLimit.resetSeconds));
      return response;
    }

    const body = await request.json().catch(() => null);
    const parsed = reactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid reaction request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { messageId, emoji } = parsed.data;

    // 1. Verify message exists and get conversation_id
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .is('deleted_at', null)
      .maybeSingle();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // 2. Verify current user is an authorized member of the conversation
    const { data: membership, error: memberError } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Forbidden: You are not a member of this conversation' },
        { status: 403 }
      );
    }

    // 3. Check for existing reaction by this user on this message
    const { data: existingReaction } = await supabase
      .from('message_reactions')
      .select('id, emoji')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .maybeSingle();

    let action: 'added' | 'removed' | 'switched';

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // Toggle OFF: User clicked the same emoji again -> remove it
        const { error: delError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (delError) throw delError;
        action = 'removed';
      } else {
        // SWITCH: User clicked a different emoji -> update or replace
        const { error: updateError } = await supabase
          .from('message_reactions')
          .update({ emoji })
          .eq('id', existingReaction.id);

        if (updateError) throw updateError;
        action = 'switched';
      }
    } else {
      // ADD: No previous reaction -> insert new
      const { error: insError } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });

      if (insError) throw insError;
      action = 'added';
    }

    // 4. Retrieve the updated reactions for this message to guarantee server reconciliation
    const { data: updatedReactions } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .eq('message_id', messageId);

    return NextResponse.json({
      success: true,
      action,
      emoji,
      messageId,
      userId: user.id,
      conversationId: message.conversation_id,
      reactions: updatedReactions || [],
    });
  } catch (err: unknown) {
    console.error('[reactions] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred processing reaction' }, { status: 500 });
  }
}

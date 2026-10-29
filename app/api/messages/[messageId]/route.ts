import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';

const editSchema = z.object({
  content: z.string().trim().min(1, 'Message content cannot be empty').max(5000, 'Message content cannot exceed 5000 characters'),
});

const uuidSchema = z.string().uuid();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    // 1. Validate UUID format
    if (!uuidSchema.safeParse(messageId).success) {
      return NextResponse.json({ error: 'Invalid message ID format' }, { status: 400 });
    }

    const supabase = await createClient();

    // 2. Authenticate session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 60 edits per minute per user
    const rateLimit = checkRateLimit(`msg_edit:${user.id}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      const res = NextResponse.json({ error: 'Too many edit requests. Please wait a moment.' }, { status: 429 });
      res.headers.set('Retry-After', String(rateLimit.resetSeconds));
      return res;
    }

    // 3. Parse and validate payload
    const body = await request.json().catch(() => null);
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid message content' },
        { status: 400 }
      );
    }

    const trimmedContent = parsed.data.content;

    // 4. Query target message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, deleted_at')
      .eq('id', messageId)
      .maybeSingle();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.deleted_at) {
      return NextResponse.json({ error: 'Cannot edit a deleted message' }, { status: 400 });
    }

    // 5. Enforce ownership: only author can edit
    if (message.sender_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own messages' },
        { status: 403 }
      );
    }

    // 6. Verify conversation membership
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

    // 7. Perform atomic update
    const editedAt = new Date().toISOString();
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({
        content: trimmedContent,
        edited_at: editedAt,
      })
      .eq('id', messageId)
      .eq('sender_id', user.id)
      .select('id, conversation_id, sender_id, content, edited_at, created_at, reply_to_id')
      .single();

    if (updateError || !updatedMessage) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (err: unknown) {
    console.error('[messages] Edit error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred while updating the message' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    // 1. Validate UUID format
    if (!uuidSchema.safeParse(messageId).success) {
      return NextResponse.json({ error: 'Invalid message ID format' }, { status: 400 });
    }

    const supabase = await createClient();

    // 2. Authenticate session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 60 deletes per minute per user
    const rateLimit = checkRateLimit(`msg_del:${user.id}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      const res = NextResponse.json({ error: 'Too many delete requests. Please wait a moment.' }, { status: 429 });
      res.headers.set('Retry-After', String(rateLimit.resetSeconds));
      return res;
    }

    // 3. Query target message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, deleted_at')
      .eq('id', messageId)
      .maybeSingle();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.deleted_at) {
      return NextResponse.json({ error: 'Message is already deleted' }, { status: 400 });
    }

    // 4. Enforce ownership: only author can delete
    if (message.sender_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own messages' },
        { status: 403 }
      );
    }

    // 5. Verify conversation membership
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

    // 6. Clean up reactions on this message
    await supabase.from('message_reactions').delete().eq('message_id', messageId);

    // 7. Soft-delete the message: mark deleted_at and scrub content to prevent data leakage
    const deletedAt = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from('messages')
      .update({
        deleted_at: deletedAt,
        content: 'This message was deleted',
      })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
      conversationId: message.conversation_id,
      deleted_at: deletedAt,
    });
  } catch (err: unknown) {
    console.error('[messages] Delete error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred while deleting the message' }, { status: 500 });
  }
}

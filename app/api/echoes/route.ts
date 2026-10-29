import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import type { NexusEchoItem } from '@/types/echoes';

const saveEchoSchema = z.object({
  messageId: z.string().uuid(),
  note: z.string().max(2000).nullable().optional(),
});

/**
 * GET /api/echoes
 * Fetches all echoes owned by the authenticated user.
 * Personal notes are strictly private to this user.
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

    // Query echoes with joined message, sender profile, and conversation
    const { data: rawEchoes, error: dbError } = await supabase
      .from('echoes')
      .select(`
        id,
        user_id,
        message_id,
        note,
        created_at,
        updated_at,
        messages (
          id,
          conversation_id,
          sender_id,
          content,
          type,
          created_at,
          deleted_at,
          profiles:sender_id (
            id,
            display_name,
            username,
            avatar_url
          ),
          conversations:conversation_id (
            id,
            name,
            type
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      // Graceful fallback if table not yet migrated
      if (
        dbError.code === '42P01' ||
        dbError.code === 'PGRST205' ||
        dbError.message?.includes('does not exist') ||
        dbError.message?.includes('schema cache')
      ) {
        console.warn('Echoes table not found in database. Returning empty list.');
        return NextResponse.json({ echoes: [] });
      }
      console.error('Failed to fetch echoes:', dbError);
      return NextResponse.json({ error: 'Failed to fetch echoes' }, { status: 500 });
    }

    // Format echoes into strongly-typed NexusEchoItem array
    const echoes: NexusEchoItem[] = (rawEchoes || []).map((row: any) => {
      const msg = row.messages;
      let messageData = null;

      if (msg) {
        const sender = msg.profiles || {
          id: msg.sender_id,
          display_name: 'Nexus Member',
          username: 'member',
          avatar_url: null,
        };

        const conversation = msg.conversations || {
          id: msg.conversation_id,
          name: null,
          type: 'direct',
        };

        messageData = {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          content: msg.deleted_at ? 'This message was deleted' : msg.content,
          type: msg.type || 'text',
          createdAt: msg.created_at,
          deletedAt: msg.deleted_at,
          sender: {
            id: sender.id,
            name: sender.display_name || 'Member',
            username: sender.username || 'user',
            avatarUrl: sender.avatar_url,
          },
          conversation: {
            id: conversation.id,
            name: conversation.name,
            type: conversation.type,
          },
        };
      }

      return {
        id: row.id,
        userId: row.user_id,
        messageId: row.message_id,
        note: row.note || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        message: messageData,
      };
    });

    return NextResponse.json({ echoes });
  } catch (err: any) {
    console.error('GET /api/echoes unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/echoes
 * Saves a message to the user's personal echoes library with an optional private note.
 * Deduplicated via UNIQUE(user_id, message_id).
 */
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

    // Rate Limit (60 saves per minute per user)
    const rateLimit = checkRateLimit(`echo_save:${user.id}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(rateLimit.resetSeconds));
      return response;
    }

    const body = await request.json().catch(() => null);
    const parsed = saveEchoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { messageId, note } = parsed.data;

    // 1. Verify message exists
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .maybeSingle();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // 2. Verify current user is a member of the conversation
    const { data: member, error: memberError } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Forbidden: You must be a conversation participant to echo messages' },
        { status: 403 }
      );
    }

    // 3. Upsert echo record for this user and message
    const { data: existingEcho } = await supabase
      .from('echoes')
      .select('id')
      .eq('user_id', user.id)
      .eq('message_id', messageId)
      .maybeSingle();

    let echoRecord;

    if (existingEcho) {
      // Update note on existing echo
      const { data: updated, error: updateError } = await supabase
        .from('echoes')
        .update({
          note: note !== undefined ? note : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEcho.id)
        .select()
        .single();

      if (updateError) throw updateError;
      echoRecord = updated;
    } else {
      // Insert new echo
      const { data: inserted, error: insertError } = await supabase
        .from('echoes')
        .insert({
          user_id: user.id,
          message_id: messageId,
          note: note || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      echoRecord = inserted;
    }

    return NextResponse.json({
      echo: echoRecord,
      action: existingEcho ? 'updated' : 'saved',
    });
  } catch (err: any) {
    if (
      err?.code === '42P01' ||
      err?.code === 'PGRST205' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('schema cache')
    ) {
      return NextResponse.json(
        { error: 'Database echoes table is pending migration. Please apply 015_create_echoes.sql.' },
        { status: 503 }
      );
    }
    console.error('POST /api/echoes error:', err);
    return NextResponse.json({ error: 'Failed to save echo' }, { status: 500 });
  }
}

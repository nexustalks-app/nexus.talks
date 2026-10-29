import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateNoteSchema = z.object({
  note: z.string().max(2000).nullable(),
});

const uuidSchema = z.string().uuid();

interface RouteParams {
  params: Promise<{ echoId: string }>;
}

/**
 * PATCH /api/echoes/[echoId]
 * Updates the private note attached to an echo.
 * Strict ownership check: only the echo owner can modify it.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { echoId } = await params;
    if (!uuidSchema.safeParse(echoId).success) {
      return NextResponse.json({ error: 'Invalid echo ID format' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateNoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { note } = parsed.data;

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('echoes')
      .select('id, user_id')
      .eq('id', echoId)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Echo not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('echoes')
      .update({
        note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', echoId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ echo: updated });
  } catch (err: any) {
    console.error('PATCH /api/echoes/[echoId] error:', err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

/**
 * DELETE /api/echoes/[echoId]
 * Unsaves an echo from the user's personal echoes library.
 * Strict ownership check: only the echo owner can delete it.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { echoId } = await params;
    if (!uuidSchema.safeParse(echoId).success) {
      return NextResponse.json({ error: 'Invalid echo ID format' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('echoes')
      .select('id, user_id')
      .eq('id', echoId)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Echo not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('echoes')
      .delete()
      .eq('id', echoId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, removedId: echoId });
  } catch (err: any) {
    console.error('DELETE /api/echoes/[echoId] error:', err);
    return NextResponse.json({ error: 'Failed to delete echo' }, { status: 500 });
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { isGuideEnabledForUser } from './rollout';
import { GUIDE_RPC_ENSURE } from './constants';

/**
 * Returns the Guide conversation id for the given user, or null.
 *
 * - Returns null immediately (no DB calls) when rollout excludes the user.
 * - Calls ensure_my_guide_conversation() via RPC when rollout allows.
 * - Always wrapped in try/catch: any failure is logged and returns null.
 *   It must never throw into the layout.
 */
export async function resolveGuideConversationId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (!isGuideEnabledForUser(userId)) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc(GUIDE_RPC_ENSURE);
    if (error) {
      console.error('[guide] provision error', { event: 'provision_error', user: userId.slice(0, 8), error: error.message });
      return null;
    }
    return (data as string | null) ?? null;
  } catch (err) {
    console.error('[guide] provision exception', { event: 'provision_exception', user: userId.slice(0, 8), err: String(err) });
    return null;
  }
}

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { guideReplySchema } from '@/lib/validations/guide';
import { isGuideEnabledForUser } from '@/lib/guide/rollout';
import { getBotClient } from '@/lib/guide/bot-client';
import { buildContext } from '@/lib/guide/context';
import { generateGuideReply, GuideLlmError } from '@/lib/guide/llm';
import { sanitizeGuideReply } from '@/lib/guide/sanitize';
import { buildSystemPrompt } from '@/lib/guide/knowledge';
import {
  CLAIM_STATUS,
  GUIDE_ERROR,
  GUIDE_GLOBAL_DAILY_CAP_DEFAULT,
  GUIDE_HISTORY_MESSAGES,
  GUIDE_LLM_TIMEOUT_MS,
  GUIDE_LONG_INPUT_REPLY,
  GUIDE_MAX_INPUT_CHARS,
  GUIDE_MAX_OUTPUT_TOKENS,
  GUIDE_RPC_CLAIM,
  GUIDE_RPC_FINISH,
} from '@/lib/guide/constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Message } from '@/types/database';

export const runtime     = 'nodejs';
export const dynamic     = 'force-dynamic';
export const maxDuration = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

function err(status: number, code: string, message?: string) {
  return NextResponse.json({ error: { code, message: message ?? code } }, { status });
}

function ok(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 200 });
}

/**
 * Fire-and-forget finish_guide_turn call.
 * supabase.rpc() returns a PostgrestFilterBuilder which is a PromiseLike but
 * does not expose `.catch()`. Wrapping in an async IIFE lets us swallow errors
 * without needing the PostgREST-specific `.catch`.
 */
function finishTurnBestEffort(
  supabase: SupabaseClient,
  messageId: string,
  status: 'completed' | 'failed' | 'skipped',
  replyMessageId?: string,
  errorCode?: string,
): void {
  void (async () => {
    try {
      await supabase.rpc(GUIDE_RPC_FINISH, {
        p_message_id:       messageId,
        p_status:           status,
        p_reply_message_id: replyMessageId ?? null,
        p_error_code:       errorCode ?? null,
      });
    } catch {
      // best-effort — do not propagate
    }
  })();
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let claimStatus: string | null = null;
  let llmMs:       number | null = null;

  // ── 1. Parse + validate body ─────────────────────────────────────────────
  let body: unknown;
  try {
    const ct = req.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      return err(400, GUIDE_ERROR.BAD_REQUEST, 'Content-Type must be application/json');
    }
    body = await req.json();
  } catch {
    return err(400, GUIDE_ERROR.BAD_REQUEST, 'Malformed JSON body');
  }

  const parsed = guideReplySchema.safeParse(body);
  if (!parsed.success) {
    return err(400, GUIDE_ERROR.BAD_REQUEST, parsed.error.issues[0]?.message);
  }
  const { conversation_id, message_id } = parsed.data;

  // ── 2. Authenticate via cookie-bound server client ───────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return err(401, GUIDE_ERROR.UNAUTHORIZED);
  }

  // Capture as a plain string so TypeScript doesn't think it might be null
  // inside closures after subsequent awaits.
  const userId = user.id;

  // ── 3. Rollout gate ──────────────────────────────────────────────────────
  if (!isGuideEnabledForUser(userId)) {
    return err(503, GUIDE_ERROR.GUIDE_UNAVAILABLE);
  }

  // ── 4. claim_guide_turn ──────────────────────────────────────────────────
  const globalCapRaw = parseInt(process.env.GUIDE_GLOBAL_DAILY_CAP ?? '', 10);
  // globalCapRaw referenced to satisfy linter; the limit is hard-coded in the DB function.
  void globalCapRaw;
  void GUIDE_GLOBAL_DAILY_CAP_DEFAULT;

  const { data: claimData, error: claimErr } = await supabase.rpc(GUIDE_RPC_CLAIM, {
    p_conversation_id: conversation_id,
    p_message_id:      message_id,
  });

  if (claimErr) {
    console.error('[guide]', JSON.stringify({
      event: 'claim_error',
      user:  userId.slice(0, 8),
      error: claimErr.message,
    }));
    return err(503, GUIDE_ERROR.GUIDE_UNAVAILABLE);
  }

  const claim = claimData as { status: string; retry_after_seconds?: number };
  claimStatus = claim.status;

  // Map claim status to HTTP responses before doing any LLM work.
  switch (claim.status) {
    case CLAIM_STATUS.DISABLED:
      return err(503, GUIDE_ERROR.GUIDE_UNAVAILABLE);
    case CLAIM_STATUS.FORBIDDEN:
      return err(403, GUIDE_ERROR.NOT_GUIDE_CONVERSATION);
    case CLAIM_STATUS.INVALID_MESSAGE:
      return err(400, GUIDE_ERROR.INVALID_MESSAGE);
    case CLAIM_STATUS.ALREADY_DONE:
      return ok({ status: 'already_done' });
    case CLAIM_STATUS.IN_PROGRESS:
      return NextResponse.json({ status: 'in_progress' }, { status: 202 });
    case CLAIM_STATUS.MAX_ATTEMPTS:
      return err(429, GUIDE_ERROR.TOO_MANY_ATTEMPTS);
    case CLAIM_STATUS.RATE_LIMITED_MIN: {
      const retryAfter = claim.retry_after_seconds ?? 60;
      const res = err(429, GUIDE_ERROR.RATE_LIMITED);
      res.headers.set('Retry-After', String(retryAfter));
      return res;
    }
    case CLAIM_STATUS.RATE_LIMITED_DAY:
      return err(429, GUIDE_ERROR.DAILY_LIMIT);
    case CLAIM_STATUS.SERVICE_BUSY:
      return err(503, GUIDE_ERROR.SERVICE_BUSY);
    case CLAIM_STATUS.OK:
      break; // continue to LLM work
    default:
      return err(503, GUIDE_ERROR.GUIDE_UNAVAILABLE);
  }

  // From here on: any failure must call finish_guide_turn 'failed' before returning.
  function failTurn(code: string): NextResponse {
    finishTurnBestEffort(supabase, message_id, 'failed', undefined, code);
    console.log('[guide]', JSON.stringify({
      event:      'reply',
      user:       userId.slice(0, 8),
      claim:      claimStatus,
      llm_ms:     llmMs,
      status:     'failed',
      error_code: code,
    }));
    return err(502, GUIDE_ERROR.REPLY_FAILED);
  }

  // ── 5. Get bot client + verify ───────────────────────────────────────────
  let botUserId: string;
  let dataClient: Awaited<ReturnType<typeof getBotClient>>['dataClient'];
  try {
    ({ dataClient, botUserId } = await getBotClient());
  } catch {
    return failTurn(GUIDE_ERROR.GUIDE_UNAVAILABLE);
  }

  // ── 6. Load history under user's RLS (never accept history from client) ──
  const { data: historyRows, error: histErr } = await supabase
    .from('messages')
    .select('id, sender_id, content, type, deleted_at, created_at')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: false })
    .order('id',         { ascending: false })
    .limit(GUIDE_HISTORY_MESSAGES);

  if (histErr) {
    return failTurn(GUIDE_ERROR.REPLY_FAILED);
  }

  // Reverse to ascending order for context builder
  const history = ((historyRows ?? []) as Message[]).slice().reverse();

  // ── 7. Supersede check ───────────────────────────────────────────────────
  const newestId = history[history.length - 1]?.id;
  if (newestId && newestId !== message_id) {
    finishTurnBestEffort(supabase, message_id, 'skipped');
    console.log('[guide]', JSON.stringify({
      event:  'reply',
      user:   userId.slice(0, 8),
      claim:  claimStatus,
      status: 'skipped',
    }));
    return ok({ status: 'skipped' });
  }

  // ── 8. Long input: return fixed reply without calling the LLM ────────────
  const triggeringMsg = history.find((m) => m.id === message_id);
  if (triggeringMsg && triggeringMsg.content.length > GUIDE_MAX_INPUT_CHARS) {
    const { data: fixedRow, error: fixedErr } = await dataClient
      .from('messages')
      .insert({
        conversation_id,
        sender_id: botUserId,
        content:   GUIDE_LONG_INPUT_REPLY,
        type:      'text',
      })
      .select('id')
      .single();

    if (fixedErr || !fixedRow) {
      return failTurn(GUIDE_ERROR.REPLY_FAILED);
    }

    finishTurnBestEffort(supabase, message_id, 'completed', fixedRow.id);
    console.log('[guide]', JSON.stringify({
      event:  'reply',
      user:   userId.slice(0, 8),
      claim:  claimStatus,
      status: 'long_input_skipped',
    }));
    return ok({ status: 'replied', message_id: fixedRow.id });
  }

  // ── 9. Build context, call LLM, sanitize ────────────────────────────────
  const messages = buildContext(history, botUserId, userId);
  if (messages.length === 0) {
    return failTurn(GUIDE_ERROR.REPLY_FAILED);
  }

  let replyText: string;
  try {
    const llmStart = Date.now();
    const result = await generateGuideReply({
      system:          buildSystemPrompt(),
      messages,
      maxOutputTokens: GUIDE_MAX_OUTPUT_TOKENS,
      timeoutMs:       GUIDE_LLM_TIMEOUT_MS,
    });
    llmMs = Date.now() - llmStart;
    const sanitized = sanitizeGuideReply(result.text);
    if (!sanitized) {
      return failTurn(GUIDE_ERROR.REPLY_FAILED);
    }
    replyText = sanitized;
  } catch (e) {
    // Log the LLM error code but not the message content
    const code = e instanceof GuideLlmError ? e.code : 'provider_error';
    console.error('[guide]', JSON.stringify({ event: 'llm_error', user: userId.slice(0, 8), code }));
    return failTurn(GUIDE_ERROR.REPLY_FAILED);
  }

  // ── 10. Insert reply via bot client ──────────────────────────────────────
  const { data: replyRow, error: insertErr } = await dataClient
    .from('messages')
    .insert({
      conversation_id,
      sender_id: botUserId,
      content:   replyText,
      type:      'text',
    })
    .select('id')
    .single();

  if (insertErr || !replyRow) {
    return failTurn(GUIDE_ERROR.REPLY_FAILED);
  }

  // ── 11. Finish turn ──────────────────────────────────────────────────────
  finishTurnBestEffort(supabase, message_id, 'completed', replyRow.id);

  // Structured log — no content, no keys, no emails (spec §7.9)
  console.log('[guide]', JSON.stringify({
    event:   'reply',
    user:    userId.slice(0, 8),
    claim:   claimStatus,
    llm_ms:  llmMs,
    status:  'replied',
  }));

  return ok({ status: 'replied', message_id: replyRow.id });
}

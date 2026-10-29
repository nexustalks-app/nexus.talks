import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GUIDE_SESSION_REFRESH_THRESHOLD_S, GUIDE_SYSTEM_ACCOUNT_KIND } from './constants';

/**
 * Nexus Guide bot client (spec §7.4, rule 3).
 *
 * Key requirements:
 * - Standalone @supabase/supabase-js client: persistSession:false,
 *   autoRefreshToken:false, detectSessionInUrl:false.
 * - Data client carries explicit Authorization: Bearer <access_token>.
 * - Module-level session cache refreshed only when < 60 s remain.
 * - Single-flight: concurrent callers share one sign-in promise.
 * - Never shares tokens across instances / requests.
 * - Verifies bot user id against system_accounts before returning.
 */

interface CachedSession {
  dataClient: SupabaseClient;
  userId: string;
  expiresAt: number; // Unix seconds
}

let cached: CachedSession | null = null;

// Single-flight: if a sign-in is already in progress, all callers wait for it.
let inflightSignIn: Promise<CachedSession> | null = null;

async function signInFresh(): Promise<CachedSession> {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const email    = process.env.GUIDE_BOT_EMAIL!;
  const password = process.env.GUIDE_BOT_PASSWORD!;

  if (!url || !anon || !email || !password) {
    throw new Error('[guide] bot-client: missing required env vars (GUIDE_BOT_EMAIL / GUIDE_BOT_PASSWORD)');
  }

  // Standalone auth client — never the cookie-bound createClient from lib/supabase/server.ts
  const authClient = createClient(url, anon, {
    auth: {
      persistSession:      false,
      autoRefreshToken:    false,
      detectSessionInUrl:  false,
    },
  });

  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    // Surface 429 rate-limit distinctly so the route can return guide_unavailable
    if (signInError?.status === 429) {
      throw Object.assign(new Error('[guide] bot-client: auth rate limited'), { code: 'rate_limited' });
    }
    throw new Error(`[guide] bot-client: sign-in failed: ${signInError?.message ?? 'no session'}`);
  }

  const { access_token, expires_at, user } = signInData.session;

  // Log sign-in event — no secrets, no email, just the first 8 chars of the user id
  console.log('[guide]', JSON.stringify({ event: 'bot_signin', user: user.id.slice(0, 8) }));

  // Verify the signed-in user id matches system_accounts.
  // Uses a separate data client with the bot token.
  const checkClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${access_token}` } },
  });

  const { data: sa, error: saError } = await checkClient
    .from('system_accounts')
    .select('user_id')
    .eq('kind', GUIDE_SYSTEM_ACCOUNT_KIND)
    .single();

  if (saError || !sa) {
    throw new Error('[guide] bot-client: could not read system_accounts after sign-in');
  }

  if (sa.user_id !== user.id) {
    throw new Error('[guide] bot-client: signed-in user id does not match system_accounts.user_id — configuration error');
  }

  // Data client that all callers will use — token attached explicitly
  const dataClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${access_token}` } },
  });

  const session: CachedSession = {
    dataClient,
    userId:    user.id,
    expiresAt: expires_at ?? 0,
  };

  cached = session;
  return session;
}

/**
 * Returns a valid bot data client and the bot's user id.
 * Refreshes the cached session when fewer than GUIDE_SESSION_REFRESH_THRESHOLD_S
 * seconds remain. Concurrent callers share one sign-in promise (single-flight).
 */
export async function getBotClient(): Promise<{ dataClient: SupabaseClient; botUserId: string }> {
  const nowS = Math.floor(Date.now() / 1000);
  const needsRefresh =
    cached === null ||
    cached.expiresAt - nowS < GUIDE_SESSION_REFRESH_THRESHOLD_S;

  if (!needsRefresh) {
    return { dataClient: cached!.dataClient, botUserId: cached!.userId };
  }

  // Single-flight: if another caller already started signing in, share that promise
  if (!inflightSignIn) {
    inflightSignIn = signInFresh().finally(() => {
      inflightSignIn = null;
    });
  }

  const session = await inflightSignIn;
  return { dataClient: session.dataClient, botUserId: session.userId };
}

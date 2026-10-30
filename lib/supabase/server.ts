import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import type { CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

export const INTERNAL_VERIFIED_USER_ID_HEADER = 'x-nexus-verified-user-id';
export const INTERNAL_VERIFIED_USER_EMAIL_HEADER = 'x-nexus-verified-user-email';

/**
 * Creates a Supabase client for use in Server Components, API Routes, and Server Actions.
 * Uses the anon key (not service role) and manually handles cookie operations.
 * All database operations still enforce Row Level Security policies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component during GET render.
            // Next.js disallows setting cookies in Server Components.
            // Cookie refresh and token rotation are handled by middleware.ts.
          }
        },
      },
    }
  );
}

/**
 * Request-scoped cached helper to obtain the authenticated user in Server Components.
 *
 * Security & Performance Architecture:
 * 1. Cryptographic Verification: All requests hitting protected routes are verified
 *    at the perimeter by middleware.ts using `supabase.auth.getUser()`, which validates
 *    the JWT signature with the Supabase Auth server.
 * 2. Spoof-Proof Header Propagation: Middleware sanitizes and strips any incoming
 *    client headers before injecting `x-nexus-verified-user-id`. Server Components
 *    read this verified identity in 0ms, avoiding redundant 2.5s network roundtrips.
 * 3. Fail-Safe Direct Verification: If the internal header is absent (e.g. called
 *    outside middleware or in direct server actions), this helper falls back to calling
 *    `supabase.auth.getUser()` directly. It NEVER authorizes based on `getSession()`
 *    or unverified cookie contents.
 * 4. Deduplication: Wrapped in React `cache()` so calls across layouts, pages,
 *    and nested components within a single render cycle execute at most once.
 */
export const getAuthenticatedUser = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
}> => {
  const supabase = await createClient();

  // 1. Check for verified identity injected by middleware after getUser()
  try {
    const headerList = await headers();
    const verifiedUserId = headerList.get(INTERNAL_VERIFIED_USER_ID_HEADER);

    if (verifiedUserId) {
      const verifiedEmail = headerList.get(INTERNAL_VERIFIED_USER_EMAIL_HEADER) || undefined;
      const verifiedUser: User = {
        id: verifiedUserId,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: verifiedEmail,
      };

      return { supabase, user: verifiedUser };
    }
  } catch {
    // If headers() is unavailable, fall through to direct verification
  }

  // 2. Fail-Safe: Direct cryptographic verification with Supabase Auth server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
});

/**
 * Request-scoped cached helper to fetch the profile of an authenticated user.
 * Wrapped in React cache() so calls across layouts, pages, and components
 * within a single server render cycle execute at most once against Supabase PostgREST.
 */
export const getUserProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as Profile;
});

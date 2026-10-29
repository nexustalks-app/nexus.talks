import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * GET /api/users/search?q=@username
 *
 * Secure, private username lookup endpoint.
 *
 * Security & Privacy Guarantees:
 * 1. Requires valid user session (401 if unauthenticated).
 * 2. Exact match only (no wildcard % enumeration, no partial directory leaks).
 * 3. Strips leading '@' and normalizes input case-insensitively.
 * 4. Strictly queries only public discovery fields:
 *    (id, display_name, username, avatar_url, status, bio).
 *    NEVER queries or returns email addresses or private credentials.
 * 5. Returns `{ user: null }` on empty or no-match; never lists all users.
 * 6. Identifies if the matched user is the searching user (`is_self: true`).
 * 7. Rate-limited to prevent brute-force user enumeration.
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate Limit (60 lookups per minute per user)
    const rateLimit = checkRateLimit(`user_search:${user.id}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Search rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(rateLimit.resetSeconds));
      return response;
    }

    // 3. Extract & normalize query parameter
    const { searchParams } = new URL(request.url);
    const raw = (searchParams.get('q') || searchParams.get('username') || '').trim();

    // Strip leading '@' symbols and whitespace
    const cleanUsername = raw.replace(/^@+/, '').trim().toLowerCase();

    // Empty search query -> return empty result (never expose user directory)
    if (!cleanUsername) {
      return NextResponse.json({
        user: null,
        message: 'Enter a username to search',
      });
    }

    // Validate length and allowed characters (alphanumeric, underscores, hyphens, dots)
    if (cleanUsername.length < 3) {
      return NextResponse.json({
        user: null,
        message: 'Username must be at least 3 characters',
      });
    }

    if (cleanUsername.length > 30) {
      return NextResponse.json({
        user: null,
        message: 'Username cannot exceed 30 characters',
      });
    }

    // Reject SQL wildcards or illegal characters to enforce strict exact matching
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json({
        user: null,
        message: 'Usernames can only contain letters, numbers, underscores, dots, and hyphens',
      });
    }

    // 3. Exact case-insensitive match on public profile fields only
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, status, bio')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (error) {
      console.error('[user search] Database query error:', error.message);
      return NextResponse.json(
        { error: 'An error occurred while searching. Please try again.' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json({
        user: null,
        query: cleanUsername,
      });
    }

    // 4. Return safe public discovery payload
    const isSelf = profile.id === user.id;

    return NextResponse.json({
      user: {
        id: profile.id,
        display_name: profile.display_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
        status: profile.status,
        bio: profile.bio,
        is_self: isSelf,
      },
      query: cleanUsername,
    });
  } catch (err) {
    console.error('[user search] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

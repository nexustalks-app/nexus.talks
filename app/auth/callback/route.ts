import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { sanitizeRedirectPath } from '@/lib/security/redirect';

/**
 * Auth Callback Route Handler
 *
 * Handles:
 * 1. Supabase PKCE code exchange: ?code=...
 * 2. Supabase token_hash OTP/verification: ?token_hash=...&type=signup
 *
 * Sets the authenticated session cookies directly on the redirect response,
 * activates the user's presence status, and forwards them to /conversations
 * (or the destination specified in ?next=...).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | 'invite' | null;
  const rawNext = searchParams.get('next');

  // Strict Open-Redirect Protection
  const defaultDestination =
    type === 'recovery' || rawNext === '/update-password'
      ? '/update-password'
      : '/conversations';
  const destinationPath = sanitizeRedirectPath(rawNext, defaultDestination);
  const redirectTarget = new URL(destinationPath, origin);
  const response = NextResponse.redirect(redirectTarget);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Auth callback error: Missing Supabase environment variables');
    return NextResponse.redirect(new URL('/login?error=server_configuration_error', origin));
  }

  // Bind server client directly to the outgoing response cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    // 1. PKCE Code Exchange
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        if (data.user) {
          // Self-heal / activate profile
          await supabase
            .from('profiles')
            .update({
              status: 'online',
              last_seen_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);
        }
        return response;
      }
      console.warn('exchangeCodeForSession failed:', error?.message);
    }

    // 2. Token Hash Verification (OTP / Email Confirmation link)
    if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (!error && data?.session) {
        if (data.user) {
          await supabase
            .from('profiles')
            .update({
              status: 'online',
              last_seen_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);
        }
        return response;
      }
      console.warn('verifyOtp failed:', error?.message);
    }
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
  }

  // If code exchange was not provided or failed, redirect with actionable error
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/forgot-password?error=expired', origin));
  }
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', origin));
}

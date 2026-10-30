import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export const INTERNAL_VERIFIED_USER_ID_HEADER = 'x-nexus-verified-user-id';
export const INTERNAL_VERIFIED_USER_EMAIL_HEADER = 'x-nexus-verified-user-email';

/**
 * Cryptographically Secure Session & Route Protection Middleware
 *
 * Security Architecture:
 * 1. Header Sanitization: Explicitly deletes any incoming client-supplied
 *    internal verification headers (`x-nexus-verified-user-id`, etc.) so that
 *    clients cannot spoof identity headers to bypass authentication.
 * 2. Unauthenticated Fast-Path: If a protected path is visited with zero Supabase
 *    auth cookies, redirects to /login immediately without wasting network bandwidth.
 * 3. Cryptographic Verification: On all protected requests with cookies, executes
 *    `supabase.auth.getUser()`. This contacts the Supabase Auth server, verifies the
 *    cryptographic JWT signature, checks for user revocation/deletion, and rotates
 *    refresh tokens when expired. Forged, expired, or revoked tokens are rejected.
 * 4. Identity Forwarding: Passes the cryptographically verified user ID downstream
 *    to Server Components via sanitized internal request headers, eliminating
 *    redundant sequential network roundtrips in layout and page components.
 * 5. Cookie Propagation: Captures all cookie updates (including refresh token rotation)
 *    and writes them to both request headers (for downstream RSC) and response headers
 *    (for the browser).
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Sanitize incoming request headers: strip any client-injected internal headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(INTERNAL_VERIFIED_USER_ID_HEADER);
  requestHeaders.delete(INTERNAL_VERIFIED_USER_EMAIL_HEADER);

  // Protected routes that require authentication
  const protectedPaths = [
    '/conversations',
    '/communities',
    '/groups',
    '/people',
    '/profile',
    '/pulse',
    '/echoes',
    '/settings',
  ];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Auth routes that should redirect if already authenticated
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Fast check: inspect auth cookie presence
  const cookiesList = request.cookies.getAll();
  const hasAuthToken = cookiesList.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  // Check if request originates from the native Android app container
  const userAgent = request.headers.get('user-agent') || '';
  const isNativeApp = userAgent.includes('NexusTalksApp');

  // Native Android App: Never show the public marketing landing page '/'
  if (isNativeApp && pathname === '/') {
    const redirectTarget = hasAuthToken ? '/conversations' : '/login';
    const redirectResponse = NextResponse.redirect(new URL(redirectTarget, request.url));
    redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    redirectResponse.headers.set('Pragma', 'no-cache');
    return redirectResponse;
  }

  // If path is neither protected nor auth-exclusive, pass through immediately
  if (!isProtectedPath && !isAuthPath) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // If visiting a protected path with zero auth cookies, redirect to login immediately
  if (isProtectedPath && !hasAuthToken) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    redirectResponse.headers.set('Pragma', 'no-cache');
    return redirectResponse;
  }

  // If visiting an auth page with zero auth cookies, allow access immediately
  if (isAuthPath && !hasAuthToken) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Set up Supabase SSR client with proper cookie setAll handlers for token rotation
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Cryptographically verify user authenticity with Supabase Auth server.
  // NEVER authorize users solely from local cookie parsing or getSession().
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If unauthenticated or token is forged, expired, malformed, or revoked:
  if (isProtectedPath && (authError || !user)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    redirectResponse.headers.set('Pragma', 'no-cache');
    // Forward any cookie changes (e.g. invalid session cleanup)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // If already authenticated user visits /login or /signup, redirect to /conversations
  if (isAuthPath && user) {
    const redirectResponse = NextResponse.redirect(
      new URL('/conversations', request.url)
    );
    redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    redirectResponse.headers.set('Pragma', 'no-cache');
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // Forward cryptographically verified identity downstream via sanitized internal headers
  if (user) {
    requestHeaders.set(INTERNAL_VERIFIED_USER_ID_HEADER, user.id);
    requestHeaders.set(INTERNAL_VERIFIED_USER_EMAIL_HEADER, user.email || '');
  }

  // Construct final response forwarding sanitized request headers and updated cookies
  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g., images, fonts)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export const INTERNAL_VERIFIED_USER_ID_HEADER = 'x-nexus-verified-user-id';
export const INTERNAL_VERIFIED_USER_EMAIL_HEADER = 'x-nexus-verified-user-email';
export const SESSION_SYNC_COOKIE_NAME = 'sb-nexus-session-sync';
export const SESSION_SYNC_WINDOW_S = 90; // 90 seconds (bounded window between 60-120s)
export const SESSION_SYNC_MAX_AGE_S = 120; // 120 seconds max cookie lifetime

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;

/**
 * Retrieves the dedicated server-only HMAC key for session verification markers.
 * Must be configured via SESSION_VERIFY_SECRET (minimum 32 characters).
 *
 * CRITICAL SECURITY INVARIANT:
 * - NEVER fall back to NEXT_PUBLIC_* variables, anon keys, or hardcoded strings.
 * - If the secret is missing, invalid, or below minimum security length (< 32 chars),
 *   returns null to fail-safe, disabling the fast-path completely and forcing
 *   server-side supabase.auth.getUser() verification.
 */
async function getHmacKey(): Promise<CryptoKey | null> {
  const secret = process.env.SESSION_VERIFY_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < 32) {
    return null;
  }
  try {
    const enc = new TextEncoder();
    return await crypto.subtle.importKey(
      'raw',
      enc.encode(secret.trim()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  } catch {
    return null;
  }
}

/**
 * Computes the full 64-character lowercase hexadecimal SHA-256 digest of a message.
 * No truncation is performed.
 */
async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(message));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Mints a cryptographically signed session sync marker.
 * Binds the authenticated user ID and full 64-hex SHA-256 token hash to the verified timestamp.
 * Returns null if SESSION_VERIFY_SECRET is missing or invalid.
 */
export async function createSessionMarker(
  userId: string,
  rawToken: string,
  verifiedAt: number
): Promise<string | null> {
  const key = await getHmacKey();
  if (!key) return null; // Fail-safe: missing or invalid secret disables marker minting

  const tokenHash = await sha256Hex(rawToken);
  const payload = `${userId}:${tokenHash}:${verifiedAt}`;
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const sigB64 = base64UrlEncode(new Uint8Array(sig));
  return `${payload}.${sigB64}`;
}

/**
 * Cryptographically verifies the session sync marker.
 * Enforces:
 * 1. Dedicated server-only secret is configured (returns false if secret missing/invalid).
 * 2. Valid HMAC-SHA256 signature signed by the server-only secret.
 * 3. User ID strictly matches claims.sub and standard UUID format.
 * 4. Token hash strictly matches full 64-hex SHA-256 of the active access token.
 * 5. verifiedAt is strictly validated as a 10-digit positive integer Unix timestamp,
 *    not in the future (within 5s clock tolerance), and within the 60-120s bounded window.
 */
export async function verifySessionMarker(
  marker: string | undefined | null,
  userId: string,
  rawToken: string,
  maxWindowSeconds: number = SESSION_SYNC_WINDOW_S
): Promise<boolean> {
  try {
    if (!marker || typeof marker !== 'string') return false;

    // Fail-safe: if SESSION_VERIFY_SECRET is missing or invalid, disable marker fast-path
    const key = await getHmacKey();
    if (!key) return false;

    const lastDot = marker.lastIndexOf('.');
    if (lastDot === -1) return false;

    const payload = marker.slice(0, lastDot);
    const sigB64 = marker.slice(lastDot + 1);
    if (!sigB64) return false;

    const parts = payload.split(':');
    if (parts.length !== 3) return false;

    const [markerUserId, markerTokenHash, verifiedAtStr] = parts;

    // Strict user ID check
    if (!UUID_REGEX.test(markerUserId) || markerUserId !== userId) return false;

    // Strict full 64-hex token hash check
    if (!SHA256_HEX_REGEX.test(markerTokenHash)) return false;
    const expectedTokenHash = await sha256Hex(rawToken);
    if (markerTokenHash !== expectedTokenHash) return false;

    // Strict integer validation for verifiedAt: exactly 10 digits (seconds epoch)
    // Rejects decimals, non-digits, negative signs, scientific notation, and parseInt trailing garbage
    if (!/^\d{10}$/.test(verifiedAtStr)) return false;

    const verifiedAt = Number(verifiedAtStr);
    if (!Number.isSafeInteger(verifiedAt) || verifiedAt <= 0) return false;

    const now = Math.floor(Date.now() / 1000);
    // Reject future timestamps beyond 5s clock tolerance
    if (verifiedAt > now + 5) return false;
    // Reject timestamps outside the bounded window
    if (now - verifiedAt > maxWindowSeconds) return false;

    const sigBytes = base64UrlDecode(sigB64);
    const enc = new TextEncoder();
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as BufferSource,
      enc.encode(payload) as BufferSource
    );
  } catch {
    return false;
  }
}

/**
 * Official Supabase Project Public Signing Key (JWKS)
 * Project: nkwenqntxbqzrmdztflo
 * Algorithm: ES256 (ECDSA with P-256 curve and SHA-256)
 * Endpoint: https://nkwenqntxbqzrmdztflo.supabase.co/auth/v1/.well-known/jwks.json
 *
 * Pre-supplying the public key enables offline cryptographic signature verification
 * via WebCrypto (crypto.subtle.verify) in < 0.5ms without hitting the remote Auth server.
 * If Supabase rotates keys, getClaims() automatically fetches the new key from the endpoint.
 */
const SUPABASE_PROJECT_JWKS = {
  keys: [
    {
      alg: 'ES256',
      crv: 'P-256',
      ext: true,
      key_ops: ['verify'],
      kid: '89af3a04-93dd-4276-af48-bd8975680a1e',
      kty: 'EC',
      use: 'sig',
      x: 'tXc19lcAyDErwTHTB5qLjPYERtYdBqRxBvpanEarLLY',
      y: '5vzjh1yJ7CcTX8n8PUg-_vKTaNXONhAb3p4wCCQLaP0',
    },
  ],
};

/**
 * Extracts the raw access token string from Supabase session cookies.
 * Handles both unified and chunked cookies (`.0`, `.1`, etc.) and base64/base64url wrappers.
 */
function extractAccessTokenFromCookies(
  cookiesList: { name: string; value: string }[]
): string | null {
  try {
    const tokenCookies = cookiesList
      .filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
      .sort((a, b) => {
        const idxA = a.name.includes('.') ? parseInt(a.name.split('.').pop() || '0', 10) : 0;
        const idxB = b.name.includes('.') ? parseInt(b.name.split('.').pop() || '0', 10) : 0;
        return idxA - idxB;
      });

    if (tokenCookies.length === 0) return null;

    const raw = tokenCookies.map((c) => c.value).join('');
    let jsonString = '';

    if (raw.startsWith('base64-')) {
      const b64 = raw.slice(7);
      const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      jsonString = atob(padded);
    } else {
      jsonString = decodeURIComponent(raw);
    }

    const parsed = JSON.parse(jsonString);

    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return parsed[0];
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.access_token === 'string') {
      return parsed.access_token;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cryptographically Secure Session & Route Protection Middleware
 *
 * Security Architecture:
 * 1. Header Sanitization: Explicitly deletes any incoming client-supplied
 *    internal verification headers (`x-nexus-verified-user-id`, etc.) so that
 *    clients cannot spoof identity headers to bypass authentication.
 * 2. Unauthenticated Fast-Path: If a protected path is visited with zero Supabase
 *    auth cookies, redirects to /login immediately without wasting network bandwidth.
 * 3. Cryptographic Signature Verification (`supabase.auth.getClaims`):
 *    Verifies the ECDSA P-256 cryptographic signature of the session access token
 *    using WebCrypto (crypto.subtle.verify) and the project's official public signing key.
 *    Forged, expired, malformed, or tampered tokens fail verification instantly.
 * 4. Token Refresh & Rotation Fallback (`supabase.auth.getUser`):
 *    If the token has expired, is nearing expiration (<60s remaining), or fails local
 *    verification, contacts the Supabase Auth server using the refresh token, rotates
 *    the session, and propagates rotated cookies to both request and response.
 * 5. Identity Forwarding: Passes the cryptographically verified user ID downstream
 *    to Server Components via sanitized internal request headers, eliminating
 *    redundant sequential network roundtrips in layout and page components.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Sanitize incoming request headers: strictly strip client-injected internal headers
  // to ensure client-supplied values are never trusted.
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

  // ── Cryptographic JWT Verification Fast-Path (0ms Network Latency) ─────────
  // Extract the raw access token and verify its cryptographic ECDSA (ES256) signature
  // using the official Supabase public key via WebCrypto (crypto.subtle.verify).
  // This is TRUE cryptographic verification: forged or tampered tokens are rejected.
  const rawAccessToken = extractAccessTokenFromCookies(cookiesList);
  if (rawAccessToken) {
    try {
      const { data: claimsData, error: claimsError } = await supabase.auth
        .getClaims(rawAccessToken, { jwks: SUPABASE_PROJECT_JWKS })
        .catch((err) => ({ data: null, error: err }));

      if (!claimsError && claimsData?.claims) {
        const claims = claimsData.claims as {
          sub?: string;
          email?: string;
          exp?: number;
          nbf?: number;
          aud?: string;
          role?: string;
          iss?: string;
        };
        const now = Math.floor(Date.now() / 1000);

        // Explicit Application-Level Claim Validation:
        // 1. Signature, Algorithm (ES256), & Key ID: Verified cryptographically by WebCrypto & project JWKS
        // 2. Issuer (iss): Must match the exact canonical Supabase project auth endpoint
        const expectedIssuer = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
        const isValidIssuer = claims.iss === expectedIssuer;

        // 3. Audience (aud) & Role (role): Independently verified as 'authenticated'
        const isValidAudience = claims.aud === 'authenticated';
        const isValidRole = claims.role === 'authenticated';

        // 4. Subject (sub): Must match standard UUID format (36 chars, hex + hyphens)
        const hasValidSubject =
          typeof claims.sub === 'string' && UUID_REGEX.test(claims.sub);

        // 5. Expiration (exp): Must have at least 60s remaining before proactive rotation
        const isUnexpired = typeof claims.exp === 'number' && claims.exp - now > 60;

        // 6. Not-Before (nbf): Absent is acceptable; if present, must be a finite number and not in the future
        const isNotBeforeValid =
          claims.nbf === undefined ||
          (typeof claims.nbf === 'number' && Number.isFinite(claims.nbf) && now >= claims.nbf);

        // Never allow a valid signature alone to bypass application-level claim validation.
        if (
          hasValidSubject &&
          isValidIssuer &&
          isValidAudience &&
          isValidRole &&
          isUnexpired &&
          isNotBeforeValid
        ) {
          // Bounded Session Revalidation Check:
          // Check for a cryptographically signed, unexpired session sync marker.
          // If the marker is missing, expired (>90s), tampered, or mismatched to user/token,
          // bypass the fast path so that getUser() re-verifies revocation with Supabase Auth.
          const syncMarker = request.cookies.get(SESSION_SYNC_COOKIE_NAME)?.value;
          const isSessionRecentlyVerified = await verifySessionMarker(
            syncMarker,
            claims.sub as string,
            rawAccessToken,
            SESSION_SYNC_WINDOW_S
          );

          if (isSessionRecentlyVerified) {
            if (isAuthPath) {
              const redirectResponse = NextResponse.redirect(
                new URL('/conversations', request.url)
              );
              redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
              redirectResponse.headers.set('Pragma', 'no-cache');
              return redirectResponse;
            }

            // Inject cryptographically verified identity downstream via sanitized headers
            requestHeaders.set(INTERNAL_VERIFIED_USER_ID_HEADER, claims.sub as string);
            requestHeaders.set(INTERNAL_VERIFIED_USER_EMAIL_HEADER, claims.email || '');

            return NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
          }
        }
      }
    } catch {
      // If cryptographic verification or JWKS lookup throws, safely fall through to getUser()
    }
  }

  // ── Fallback Token Refresh & Perimeter Auth Verification ───────────────────
  // Reached if:
  // 1. Token is expired or expiring within 60s (proactively triggers refresh_token rotation)
  // 2. Token is missing or malformed
  // 3. Signature verification failed (forged/tampered tokens)
  // Contacts Supabase Auth server, checks revocation/ban, and updates cookies via setAll.
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
    // Clear the session verification marker
    redirectResponse.cookies.set(SESSION_SYNC_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    // Forward any cookie changes (e.g. invalid session cleanup)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // If user is verified by Supabase Auth server:
  if (user) {
    // Mint and attach a cryptographically signed session verification marker
    // establishing the start of the 60-120s bounded revalidation window.
    const verifiedAt = Math.floor(Date.now() / 1000);
    // Ensure the marker is signed against the exact access token verified by getUser(),
    // prioritizing freshly rotated cookies on supabaseResponse, then request cookies, then rawAccessToken.
    const activeToken =
      extractAccessTokenFromCookies(supabaseResponse.cookies.getAll()) ||
      extractAccessTokenFromCookies(request.cookies.getAll()) ||
      rawAccessToken;
    if (activeToken) {
      const marker = await createSessionMarker(user.id, activeToken, verifiedAt);
      if (marker) {
        supabaseResponse.cookies.set(SESSION_SYNC_COOKIE_NAME, marker, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: SESSION_SYNC_MAX_AGE_S,
        });
      }
    }

    // Forward cryptographically verified identity downstream via sanitized internal headers
    requestHeaders.set(INTERNAL_VERIFIED_USER_ID_HEADER, user.id);
    requestHeaders.set(INTERNAL_VERIFIED_USER_EMAIL_HEADER, user.email || '');
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

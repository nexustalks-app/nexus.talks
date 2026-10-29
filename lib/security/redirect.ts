/**
 * Security Utility: Open Redirect Protection
 *
 * Ensures that redirect destination paths are strictly relative to the application origin
 * and cannot be exploited for open redirect attacks (e.g. protocol-relative URLs,
 * backslash tricks `/\evil.com`, scheme injection `javascript:`, `data:`, or external domains).
 */

const FORBIDDEN_REDIRECT_PATHS = new Set(['/login', '/signup', '/auth/callback']);

export function sanitizeRedirectPath(
  rawPath: string | null | undefined,
  fallback: string = '/conversations'
): string {
  if (!rawPath || typeof rawPath !== 'string') {
    return fallback;
  }

  const trimmed = rawPath.trim();

  // 1. Must start with a single forward slash and not a double slash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  // 2. Reject any backslashes (prevents `/\`, `/\\`, or URL-encoded backslash attacks in WebKit/Chromium)
  if (trimmed.includes('\\') || trimmed.includes('%5c') || trimmed.includes('%5C')) {
    return fallback;
  }

  // 3. Reject embedded protocol schemes or colon characters before query/hash
  const pathWithoutQuery = trimmed.split('?')[0].split('#')[0];
  if (pathWithoutQuery.includes(':')) {
    return fallback;
  }

  // 4. Validate through standard URL constructor relative to dummy origin
  try {
    const dummyOrigin = 'https://nexus.security.local';
    const parsed = new URL(trimmed, dummyOrigin);

    // Must strictly match the dummy origin (guarantees no domain escape)
    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }

    // Must be a non-empty relative pathname
    if (!parsed.pathname || !parsed.pathname.startsWith('/')) {
      return fallback;
    }

    // Avoid redirect loops to auth screens
    if (FORBIDDEN_REDIRECT_PATHS.has(parsed.pathname)) {
      return fallback;
    }

    // Return the safe relative path (pathname + query + hash)
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

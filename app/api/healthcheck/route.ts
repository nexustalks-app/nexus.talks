import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/healthcheck
 * Safe, minimal health endpoint for deployment probes and uptime monitors.
 * Probes the upstream Supabase auth service without exposing any URLs, keys, or credentials.
 */
export async function GET() {
  let supabaseStatus = 'unconfigured';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (url) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        signal: AbortSignal.timeout(2500),
      });
      supabaseStatus = res.ok ? 'connected' : 'reachable_degraded';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ENOTFOUND') || msg.includes('fetch failed')) {
        supabaseStatus = 'unreachable_dns_failure (project paused or invalid URL)';
      } else if (msg.includes('abort') || msg.includes('timeout')) {
        supabaseStatus = 'unreachable_timeout';
      } else {
        supabaseStatus = 'unreachable';
      }
    }
  }

  return NextResponse.json(
    {
      status: 'ok',
      supabase: supabaseStatus,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

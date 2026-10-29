import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Creates or retrieves the singleton Supabase client for use in Client Components
 * and browser-side code.
 *
 * Reusing a single browser client instance guarantees:
 * 1. A single shared Realtime WebSocket connection across all components.
 * 2. Shared authentication state and tokens across all subscriptions.
 * 3. Prevention of duplicate connections, memory leaks, and connection limits.
 */
export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return client;
}

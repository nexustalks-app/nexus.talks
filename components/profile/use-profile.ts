'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

interface UseProfileOptions {
  /** Look the profile up by id (preferred)... */
  userId?: string;
  /** ...or by username when the id is not available. */
  username?: string;
  /** Set to false to skip fetching (e.g. while a modal is closed). */
  enabled?: boolean;
}

/**
 * Fetches another user's profile through the regular browser Supabase client,
 * so existing RLS policies apply exactly as they do for user discovery.
 */
export function useProfile({
  userId,
  username,
  enabled = true,
}: UseProfileOptions): ProfileState {
  const [fetched, setFetched] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || (!userId && !username)) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = createClient();
        const base = supabase.from('profiles').select('*');
        const { data, error: fetchError } = userId
          ? await base.eq('id', userId).maybeSingle()
          : await base.eq('username', username as string).maybeSingle();

        if (cancelled) return;

        if (fetchError) {
          setError(fetchError.message);
        } else if (!data) {
          setError('Profile not found');
        } else {
          setFetched(data as Profile);
        }
      } catch {
        if (!cancelled) setError('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, username]);

  // Never surface a previously fetched profile that belongs to someone else.
  const matches =
    fetched !== null &&
    (userId ? fetched.id === userId : fetched.username === username);

  return { profile: matches ? fetched : null, loading, error };
}

// Module-level user-scoped cache for the authenticated user's profile to eliminate navigation latency
let cachedCurrentProfile: { userId: string; profile: Profile } | null = null;

export function clearProfileCache() {
  cachedCurrentProfile = null;
}

// Automatic cache invalidation on Supabase Auth events (signout, account switch)
if (typeof window !== 'undefined') {
  try {
    const sb = createClient();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearProfileCache();
      } else if (session?.user && cachedCurrentProfile && cachedCurrentProfile.userId !== session.user.id) {
        clearProfileCache();
      }
    });
  } catch {
    // ignore in environments where client cannot initialize
  }
}

/**
 * Loads the profile of the currently authenticated user
 * (auth.getSession() / auth.getUser() -> profiles row with the same id).
 * Cached in memory per user so subsequent visits to /profile render instantly with 0ms delay.
 */
export function useCurrentProfile(): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(() => {
    return cachedCurrentProfile ? cachedCurrentProfile.profile : null;
  });
  const [loading, setLoading] = useState(cachedCurrentProfile === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        
        // Fast-path: Check local browser session cache first (0ms)
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;

        // Fallback: If not in local session cache, contact Supabase Auth
        if (!user) {
          const {
            data: { user: fetchedUser },
            error: authError,
          } = await supabase.auth.getUser();

          if (cancelled) return;

          if (authError || !fetchedUser) {
            setError('Please sign in to view your profile.');
            return;
          }
          user = fetchedUser;
        }

        if (cancelled) return;

        // Account switch safety: if cached profile belongs to a different user, clear it
        if (cachedCurrentProfile && cachedCurrentProfile.userId !== user.id) {
          cachedCurrentProfile = null;
          setProfile(null);
          setLoading(true);
        }

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) {
          if (!cachedCurrentProfile) {
            setError(fetchError.message);
          }
        } else if (!data) {
          if (!cachedCurrentProfile) {
            setError('Profile not found');
          }
        } else {
          cachedCurrentProfile = { userId: user.id, profile: data as Profile };
          setProfile(cachedCurrentProfile.profile);
        }
      } catch {
        if (!cancelled && !cachedCurrentProfile) {
          setError('Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading, error };
}

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

/**
 * Loads the profile of the currently authenticated user
 * (auth.getUser() -> profiles row with the same id).
 */
export function useCurrentProfile(): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !user) {
          setError('Please sign in to view your profile.');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) {
          setError(fetchError.message);
        } else if (!data) {
          setError('Profile not found');
        } else {
          setProfile(data as Profile);
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
  }, []);

  return { profile, loading, error };
}

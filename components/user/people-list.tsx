'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, UserX, Shield, Sparkles } from 'lucide-react';
import type { Profile } from '@/types/database';
import { UserCard } from './user-card';

interface PeopleListProps {
  currentUserId: string;
}

type SearchUserResult = Pick<
  Profile,
  'id' | 'display_name' | 'username' | 'avatar_url' | 'status' | 'bio'
> & {
  is_self?: boolean;
};

export function PeopleList({ currentUserId }: PeopleListProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [result, setResult] = useState<SearchUserResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(
    async (rawQuery: string) => {
      const clean = rawQuery.replace(/^@+/, '').trim().toLowerCase();

      // If empty query, reset to default private empty state (never expose user list)
      if (!clean) {
        setResult(null);
        setSearched(false);
        setSubmittedQuery(null);
        setError(null);
        setLoading(false);
        return;
      }

      if (clean.length < 3) {
        setError('Usernames must be at least 3 characters.');
        setResult(null);
        setSearched(true);
        setSubmittedQuery(clean);
        return;
      }

      // Abort any existing in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);
      setSubmittedQuery(clean);

      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(clean)}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to search for user');
        }

        const data = await response.json();
        setResult(data.user ?? null);
        setSearched(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Ignored aborted stale search
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred during search. Please try again.'
        );
        setResult(null);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search when user types 3+ characters
  useEffect(() => {
    const clean = query.replace(/^@+/, '').trim();
    if (!clean) {
      setResult(null);
      setSearched(false);
      setSubmittedQuery(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (clean.length < 3) {
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(query);
    }, 450);

    return () => clearTimeout(timer);
  }, [query, executeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setQuery('');
    setResult(null);
    setSearched(false);
    setSubmittedQuery(null);
    setError(null);
    setLoading(false);
  };

  const handleStartConversation = async (participantId: string) => {
    if (participantId === currentUserId) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to start conversation');
        return;
      }
      router.push(`/conversations/${data.conversation_id}`);
    } catch {
      setError('Failed to start conversation. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-porcelain select-none overflow-y-auto overscroll-contain pb-24 lg:pb-8">
      {/* ── Signature Glass Header ───────────────────────────────────────── */}
      <header className="shrink-0 glass-header border-b border-stone/80 bg-white/85 dark:bg-[#1C1619]/85 backdrop-blur-md px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground sm:text-3xl">
                Find your people
              </h1>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted dark:text-muted-foreground">
                Search by unique username to discover profiles and start private direct conversations.
              </p>
            </div>

            <div className="mt-3 sm:mt-0 flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-stone-subtle dark:border-[#3B2C34] bg-porcelain/80 dark:bg-wine/10 px-3 py-1 text-[11px] font-medium text-muted">
              <Shield className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" />
              <span>Private Username Discovery</span>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[14px] text-wine dark:text-[#E2A6B3]">
                @
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter exact username (e.g. sarah or @alex_dev)…"
                aria-label="Search username"
                autoComplete="off"
                spellCheck="false"
                className="search-input w-full rounded-2xl py-3 pl-8 pr-10 text-[14px] bg-white dark:bg-[#231B20] border border-stone/90 dark:border-[#3B2C34] shadow-sm focus:border-wine focus:ring-2 focus:ring-wine/15 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-charcoal dark:hover:text-foreground transition-transform duration-120 ease-out active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-wine px-6 text-[13.5px] font-semibold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-wine-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border-t border-white/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" strokeWidth={2.2} />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>
        </div>
      </header>

      {/* ── Main Results Stage ───────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-4xl">
          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-rose/30 bg-rose/10 dark:bg-rose/20 p-4 text-[13px] text-wine dark:text-[#F7B6C4] backdrop-blur-sm leading-relaxed"
            >
              {error}
            </div>
          )}

          {/* 1. Default State: No search performed yet */}
          {!searched && !loading && (
            <div className="liquid-glass-card mx-auto max-w-lg rounded-3xl p-8 sm:p-10 text-center shadow-lg nx-fade-in">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#E2A6B3] shadow-xs">
                <Search className="h-7 w-7" strokeWidth={1.8} />
              </div>

              <h2 className="font-bold text-xl tracking-tight text-charcoal dark:text-foreground sm:text-2xl">
                Private &amp; Intentional Discovery
              </h2>

              <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted dark:text-muted-foreground">
                Nexus.talks does not maintain an open public directory to protect member privacy. To start a chat, enter the exact username of the person you wish to contact.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-subtle dark:border-[#382833] bg-porcelain dark:bg-[#271E23] px-4 py-1.5 text-[12px] font-medium text-charcoal/80 dark:text-stone/80">
                <Sparkles className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" />
                <span>Search works with or without the leading @</span>
              </div>
            </div>
          )}

          {/* 2. Loading State */}
          {loading && (
            <div className="mx-auto max-w-md rounded-3xl border border-stone/70 dark:border-[#3B2C34] bg-white/60 dark:bg-[#20171D]/60 p-8 text-center animate-pulse">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-wine/10 dark:bg-wine/25 text-wine">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
              <p className="text-[14px] font-medium text-charcoal dark:text-foreground">
                Looking up @{submittedQuery}…
              </p>
              <p className="text-[12px] text-muted dark:text-muted-foreground mt-1">
                Querying verified member directory
              </p>
            </div>
          )}

          {/* 3. Result Found */}
          {!loading && searched && result && (
            <div className="mx-auto max-w-lg space-y-4 nx-banner-enter">
              <div className="flex items-center justify-between px-2">
                <span className="text-[12.5px] font-semibold text-muted dark:text-muted-foreground uppercase tracking-wider">
                  Member Found
                </span>
                <span className="text-[12px] text-wine dark:text-[#E2A6B3] font-mono">
                  @{result.username}
                </span>
              </div>

              <UserCard
                user={result}
                onClick={() => handleStartConversation(result.id)}
                disabled={connecting}
              />
            </div>
          )}

          {/* 4. No Result Found */}
          {!loading && searched && !result && !error && (
            <div className="liquid-glass-card mx-auto max-w-lg rounded-3xl p-8 sm:p-10 text-center shadow-lg nx-fade-in">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone/50 dark:bg-[#2F232B] text-muted shadow-xs">
                <UserX className="h-7 w-7 text-muted" strokeWidth={1.8} />
              </div>

              <h2 className="font-bold text-lg tracking-tight text-charcoal dark:text-foreground sm:text-xl">
                No member found for &ldquo;@{submittedQuery}&rdquo;
              </h2>

              <p className="mt-2 text-[13px] leading-relaxed text-muted dark:text-muted-foreground">
                Double-check the spelling. Usernames must match exactly. Nexus.talks accounts are private and will not appear in broad or partial searches.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

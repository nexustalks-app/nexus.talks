'use client';

import { useState, useEffect } from 'react';
import { Search, X, Sparkles, Users, ArrowUpRight, Check, Compass, Info } from 'lucide-react';
import { SAMPLE_COMMUNITIES, type Community } from '@/lib/communities/community-data';
import { CommunityPreviewModal } from './community-preview-modal';
import { cn } from '@/lib/utils/cn';

const CATEGORIES = [
  'All',
  'Culture & Conversation',
  'Design & Technology',
  'Books & Learning',
  'Science & Exploration',
] as const;

export function CommunitiesView() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewCommunity, setPreviewCommunity] = useState<Community | null>(null);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load demo joined state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nx_demo_communities');
      if (raw) {
        setJoinedCommunities(new Set(JSON.parse(raw)));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleJoin = (communityId: string) => {
    setJoinedCommunities((prev) => {
      const next = new Set(prev);
      const isJoining = !next.has(communityId);
      if (isJoining) {
        next.add(communityId);
      } else {
        next.delete(communityId);
      }
      try {
        localStorage.setItem('nx_demo_communities', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }

      const community = SAMPLE_COMMUNITIES.find((c) => c.id === communityId);
      if (community) {
        setToastMessage(
          isJoining
            ? `Joined ${community.name} (Demo Membership)`
            : `Left ${community.name}`
        );
        setTimeout(() => setToastMessage(null), 2400);
      }

      return next;
    });
  };

  const filteredCommunities = SAMPLE_COMMUNITIES.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex h-full flex-col bg-porcelain select-none overflow-y-auto overscroll-contain">
      {/* ── Signature Glass Header ───────────────────────────────────────── */}
      <div className="shrink-0 glass-header border-b border-stone/80 bg-white/85 dark:bg-[#1C1619]/85 backdrop-blur-md px-5 py-5 sm:px-10 sm:py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine/10 text-wine dark:bg-wine/25 shadow-xs">
                  <Compass className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground sm:text-3xl">
                  Communities
                </h1>
              </div>
              <p className="mt-1 text-xs text-muted sm:text-[13.5px]">
                Discover and explore curated discussion spaces crafted around shared interests.
              </p>
            </div>

            {/* Illustrative Demo indicator */}
            <div className="mt-2 sm:mt-0 flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-stone-subtle dark:border-[#3B2C34] bg-porcelain/80 dark:bg-wine/10 px-3 py-1 text-[11px] font-medium text-muted">
              <Info className="h-3.5 w-3.5 text-wine" />
              <span>Sample Public Communities &middot; Demo Content</span>
            </div>
          </div>

          {/* Search bar & Category filters */}
          <div className="mt-5 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search communities by name, topic, or category…"
                aria-label="Search communities"
                className="search-input w-full rounded-xl py-2.5 pl-10 pr-9 text-[13.5px] bg-white dark:bg-[#231B20] border border-stone shadow-sm focus:border-wine focus:ring-2 focus:ring-wine/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-transform duration-120 ease-out hover:text-charcoal active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Horizontal pill scroller */}
            <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1 text-[12px] font-semibold transition-all duration-150 ease-out active:scale-95',
                    selectedCategory === cat
                      ? 'bg-wine text-white shadow-sm'
                      : 'bg-white dark:bg-[#271E23] text-muted border border-stone dark:border-[#3B2C34] hover:text-charcoal',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Community Grid ─────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-6 sm:px-10 sm:py-8 pb-28 lg:pb-10">
        <div className="mx-auto max-w-6xl">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-wine/20 bg-wine/10 dark:bg-wine/25 px-4 py-2.5 text-xs font-semibold text-wine dark:text-[#C49DA4] shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5" />
                {toastMessage}
              </span>
            </div>
          )}

          {filteredCommunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone bg-white/70 dark:bg-[#231B20]/60 py-20 text-center shadow-sm">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-wine/10 text-wine">
                <Search className="h-6 w-6" strokeWidth={2} />
              </div>
              <p className="text-base font-semibold text-charcoal">
                No communities match &ldquo;{search}&rdquo;
              </p>
              <p className="mt-1 text-[13px] text-muted">
                Try searching for another topic, or clear filters to view all sample communities.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-wine px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-wine-hover active:scale-95"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
              {filteredCommunities.map((community) => {
                const isJoined = joinedCommunities.has(community.id);
                return (
                  <div
                    key={community.id}
                    className={cn(
                      'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone/80 dark:border-[#3B2C34]',
                      'glass-surface bg-white/90 dark:bg-[#231B20]/90 p-6 shadow-sm',
                      'transition-all duration-200 ease-smooth hover:-translate-y-1 hover:shadow-md hover:border-wine/30',
                    )}
                  >
                    {/* Top Glow Accent Bar */}
                    <div
                      className={cn(
                        'absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r',
                        community.visualTheme.cardHighlight,
                      )}
                      style={{ backgroundColor: community.visualTheme.primary }}
                    />

                    <div>
                      {/* Top Row: Icon + Category Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex h-13 w-13 items-center justify-center rounded-2xl font-bold text-base text-white shadow-sm transition-transform duration-150 group-hover:scale-105"
                          style={{ backgroundColor: community.visualTheme.primary }}
                        >
                          {community.badge}
                        </div>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold border',
                            community.visualTheme.border,
                            community.visualTheme.bgBadge,
                            community.visualTheme.textBadge,
                          )}
                        >
                          <Sparkles className="h-3 w-3" />
                          {community.category}
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <div className="mt-4">
                        <h2 className="text-lg font-bold tracking-tight text-charcoal sm:text-xl">
                          {community.name}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                          {community.tagline}
                        </p>
                      </div>

                      {/* Stats row */}
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="h-3.5 w-3.5" />
                          {community.memberCount.toLocaleString()} members
                        </span>
                        <span className="h-1 w-1 rounded-full bg-stone" />
                        <span className="text-emerald-700 font-medium">
                          {community.onlineCount} online
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-6 pt-4 border-t border-stone-subtle dark:border-[#3B2C34]/60 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewCommunity(community)}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-wine dark:text-[#C49DA4] hover:underline underline-offset-4 active:scale-95 transition-transform"
                      >
                        <span>Explore details</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleJoin(community.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all duration-150 ease-out active:scale-95',
                          isJoined
                            ? 'border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                            : 'bg-wine text-white hover:bg-wine-hover',
                        )}
                      >
                        {isJoined ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Joined</span>
                          </>
                        ) : (
                          <span>Join</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Community Preview Modal */}
      <CommunityPreviewModal
        community={previewCommunity}
        isOpen={previewCommunity !== null}
        onClose={() => setPreviewCommunity(null)}
        isJoined={previewCommunity ? joinedCommunities.has(previewCommunity.id) : false}
        onToggleJoin={handleToggleJoin}
      />
    </div>
  );
}

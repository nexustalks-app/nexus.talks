'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Bell,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { UserAvatar } from '@/components/user/user-avatar';
import type { PulseData } from '@/types/pulse';
import { cn } from '@/lib/utils/cn';

interface PulseViewProps {
  initialPulse?: PulseData;
  currentUserId?: string;
}

export function PulseView({ initialPulse, currentUserId }: PulseViewProps) {
  const router = useRouter();
  const [pulse, setPulse] = useState<PulseData | null>(initialPulse || null);
  const [loading, setLoading] = useState(!initialPulse);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPulse = async () => {
    setError(null);
    try {
      const res = await fetch('/api/pulse');
      if (res.ok) {
        const data = await res.json();
        setPulse(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Unable to load conversation pulse.');
      }
    } catch (err) {
      console.error('Failed to load pulse data:', err);
      setError('Network connection error. Please verify your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialPulse) {
      fetchPulse();
    }
  }, [initialPulse]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPulse();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-porcelain dark:bg-[#1C1619] text-charcoal dark:text-foreground">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-stone/80 dark:border-[#382C34] bg-white/70 dark:bg-[#20181D]/80 backdrop-blur-md px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
                <Activity className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground">
                Nexus Pulse
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
              Privacy-conscious overview of recent conversation activity and unread updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-stone dark:border-[#382C34] bg-white dark:bg-[#251D22] px-3 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-stone/30 dark:hover:bg-[#2C2128] transition-all"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh
            </button>
            <span className="text-[11px] font-semibold tracking-widest text-muted dark:text-muted-foreground uppercase">
              POWERED BY AASIF
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Pulse Content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-6 pb-28 md:pb-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Real Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="liquid-glass-card rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted dark:text-muted-foreground">
                Unread Messages
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-wine dark:text-[#F3B3C2]">
                  {loading ? '—' : pulse?.totalUnreadCount || 0}
                </span>
                <span className="text-xs text-muted">across all threads</span>
              </div>
            </div>

            <div className="liquid-glass-card rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted dark:text-muted-foreground">
                Active Conversations
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground">
                  {loading ? '—' : pulse?.activeConversationsCount || 0}
                </span>
                <span className="text-xs text-muted">participating</span>
              </div>
            </div>

            <div className="liquid-glass-card rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted dark:text-muted-foreground">
                Privacy Standard
              </span>
              <div className="mt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-semibold">100% Real Activity Only</span>
              </div>
            </div>
          </div>

          {/* Section 1: Active Conversations with Unread Status */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-charcoal dark:text-foreground">
                Conversation Overview
              </h2>
              <span className="text-xs text-muted">
                {pulse?.recentConversations.length || 0} conversations
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl border border-stone/60 dark:border-[#382C34]/60 bg-white/50 dark:bg-[#221A1F]/50 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200/80 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20 p-8 text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-red-600 dark:text-red-400 mb-2" />
                <p className="text-sm font-semibold text-charcoal dark:text-foreground">
                  Unable to load pulse activity
                </p>
                <p className="text-xs text-muted mt-1">{error}</p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-wine text-white px-4 py-2 text-xs font-semibold shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : (pulse?.recentConversations.length || 0) === 0 ? (
              <div className="rounded-2xl border border-stone/80 dark:border-[#382C34] bg-white dark:bg-[#221A1F] p-8 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-muted mb-2" />
                <p className="text-sm font-semibold text-charcoal dark:text-foreground">
                  No active conversations yet
                </p>
                <p className="text-xs text-muted mt-1">
                  Start a new direct message or join a group to see activity here.
                </p>
                <Link
                  href="/people"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-wine text-white px-4 py-2 text-xs font-semibold shadow-sm"
                >
                  Find People <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pulse?.recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="liquid-glass-card flex items-center justify-between gap-3 rounded-2xl p-4 shadow-xs hover:border-wine/40 dark:hover:border-wine/50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        display_name={conv.name}
                        avatar_url={conv.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-charcoal dark:text-foreground truncate">
                            {conv.name}
                          </span>
                          {conv.type === 'group' && (
                            <span className="text-[10px] uppercase font-semibold text-muted bg-stone-subtle dark:bg-stone/10 px-1.5 py-0.5 rounded">
                              Group
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted dark:text-muted-foreground truncate mt-0.5">
                          {conv.lastSenderName ? (
                            <span className="font-medium text-charcoal/80 dark:text-stone">
                              {conv.lastSenderName}:{' '}
                            </span>
                          ) : null}
                          {conv.lastMessageSnippet || 'No messages yet'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {conv.unreadCount > 0 && (
                        <span className="rounded-full bg-wine text-white text-[11px] font-bold px-2 py-0.5 shadow-2xs">
                          {conv.unreadCount}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/conversations/${conv.id}`)}
                        className="flex items-center gap-1 rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] hover:bg-wine hover:text-white dark:hover:bg-wine dark:hover:text-white px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Recent Activity Timeline */}
          {pulse?.recentActivity && pulse.recentActivity.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold tracking-tight text-charcoal dark:text-foreground">
                Recent Timeline
              </h2>
              <div className="rounded-2xl border border-stone/80 dark:border-[#382C34] bg-white/90 dark:bg-[#221A1F]/90 divide-y divide-stone-subtle dark:divide-[#382C34]/60 overflow-hidden shadow-xs">
                {pulse.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/conversations/${item.conversationId}`)}
                    className="flex items-center justify-between gap-3 p-3.5 hover:bg-porcelain/60 dark:hover:bg-[#291F26]/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        display_name={item.senderName}
                        avatar_url={item.senderAvatar}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-charcoal dark:text-foreground truncate">
                          <span className="font-bold text-wine dark:text-[#F3B3C2]">
                            {item.senderName}
                          </span>{' '}
                          in{' '}
                          <span className="font-semibold">{item.conversationName}</span>:{' '}
                          <span className="text-muted dark:text-muted-foreground italic">
                            &ldquo;{item.actionSnippet}&rdquo;
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted">
                      <span className="tabular-nums">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

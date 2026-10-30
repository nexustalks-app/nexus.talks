'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X, SquarePen, Loader2, MessageSquare, Users, User, Compass, ArrowRight, Sun, Moon, Pin, PinOff } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { useCommand } from '@/lib/command/command-context';
import { useSettings } from '@/lib/settings/settings-context';
import { useConversationNavigation } from './conversation-navigation-context';
import { subscribeToTyping } from '@/lib/realtime/typing-channel';
import {
  ConversationItem,
  type ConversationItemData,
} from './conversation-item';

interface ConversationListProps {
  currentUserId: string;
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

async function fetchLastMessage(
  supabase: SupabaseClient,
  conversationId: string,
  currentUserId: string
): Promise<{
  content: string | null;
  at: string | null;
  isOwn: boolean;
}> {
  const { data } = await supabase
    .from('messages')
    .select('content, created_at, sender_id')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    content: data?.content ?? null,
    at: data?.created_at ?? null,
    isOwn: data?.sender_id === currentUserId,
  };
}

const PINNED_STORAGE_PREFIX = 'nexus_pinned_conversations_';

function getLocalPinnedMap(userId: string): Record<string, { is_pinned: boolean; pinned_at: string | null }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${PINNED_STORAGE_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveLocalPinned(userId: string, convId: string, isPinned: boolean, pinnedAt: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const map = getLocalPinnedMap(userId);
    if (isPinned) {
      map[convId] = { is_pinned: true, pinned_at: pinnedAt || new Date().toISOString() };
    } else {
      delete map[convId];
    }
    localStorage.setItem(`${PINNED_STORAGE_PREFIX}${userId}`, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function sortByPinnedAndRecent(list: ConversationItemData[]): ConversationItemData[] {
  return [...list].sort((a, b) => {
    const aPinned = Boolean(a.is_pinned);
    const bPinned = Boolean(b.is_pinned);

    // Pinned conversations take precedence over unpinned
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // Within the pinned group, order by pinned_at DESC, then last_message_at DESC
    if (aPinned && bPinned) {
      if (a.pinned_at && b.pinned_at) {
        const diff = new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
        if (diff !== 0) return diff;
      }
    }

    // Within each group, order by last_message_at DESC
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return (
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
    );
  });
}

/* ─── main component ──────────────────────────────────────────────────────── */

// In-memory persistent cache to prevent list flickering and skeleton flashes
// when navigating between app sections (e.g. Conversations → Settings → Conversations)
let memoryConversationsCache: { userId: string; items: ConversationItemData[] } | null = null;

// Tracks whether remote Supabase schema supports is_pinned / pinned_at columns (migration 016)
let dbPinsSupported: boolean | null = null;

export function clearConversationListCache() {
  memoryConversationsCache = null;
}

// Automatic cache invalidation on Supabase Auth events (signout, account switch)
if (typeof window !== 'undefined') {
  try {
    const sb = createClient();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearConversationListCache();
      } else if (session?.user && memoryConversationsCache && memoryConversationsCache.userId !== session.user.id) {
        clearConversationListCache();
      }
    });
  } catch {
    // ignore in environments where client cannot initialize
  }
}

export function ConversationList({ currentUserId }: ConversationListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDarkTheme, updateAppearance } = useSettings();

  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [conversations, setConversations] = useState<ConversationItemData[]>(() => {
    if (memoryConversationsCache && memoryConversationsCache.userId === currentUserId) {
      return memoryConversationsCache.items;
    }
    return [];
  });
  const conversationsRef = useRef<ConversationItemData[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
    if (conversations.length > 0) {
      memoryConversationsCache = { userId: currentUserId, items: conversations };
    }
  }, [conversations, currentUserId]);

  // Account switch safety: if currentUserId changes while mounted, invalidate cache immediately
  useEffect(() => {
    if (memoryConversationsCache && memoryConversationsCache.userId !== currentUserId) {
      memoryConversationsCache = null;
      setConversations([]);
      setLoading(true);
    }
  }, [currentUserId]);

  const [loading, setLoading] = useState(() => {
    return !(
      memoryConversationsCache &&
      memoryConversationsCache.userId === currentUserId &&
      memoryConversationsCache.items.length > 0
    );
  });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [startingNew, setStartingNew] = useState(false);
  const { open: openCommand } = useCommand();

  const { navigatingId, activeId: navActiveId } = useConversationNavigation();

  const activeId =
    navActiveId ||
    (pathname.startsWith('/conversations/') ? pathname.split('/')[2] : null);

  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Context Menu state (right-click / press-and-hold on conversations)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; conversationId: string } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu]);

  /* ── data loading ──────────────────────────────────────────────────────── */

  const loadConversations = useCallback(
    async (isBackground = false) => {
      // ONLY show loading skeleton on initial load when no data is cached yet
      if (!isBackground && conversationsRef.current.length === 0) {
        setLoading(true);
      }
      setError(null);

      try {
        let memberships: {
          conversation_id: string;
          unread_count: number | null;
          is_pinned?: boolean | null;
          pinned_at?: string | null;
        }[] = [];

        const pinnedByConvId = new Map<string, { is_pinned: boolean; pinned_at: string | null }>();

        // 1. Query conversation_members (using schema-aware pin detection)
        if (dbPinsSupported !== false) {
          const { data: memberDataWithPins, error: pinErr } = await supabase
            .from('conversation_members')
            .select('conversation_id, unread_count, is_pinned, pinned_at')
            .eq('user_id', currentUserId);

          if (!pinErr && memberDataWithPins) {
            dbPinsSupported = true;
            memberships = memberDataWithPins;
            memberDataWithPins.forEach((m) => {
              pinnedByConvId.set(m.conversation_id, {
                is_pinned: Boolean(m.is_pinned),
                pinned_at: m.pinned_at || null,
              });
            });
          } else {
            // Migration 016 is unapplied on remote database.
            // Remember this so subsequent loads do not waste an extra roundtrip!
            dbPinsSupported = false;
          }
        }

        if (dbPinsSupported === false) {
          // Fall back to basic select + local storage
          const { data: basicMembers, error: basicErr } = await supabase
            .from('conversation_members')
            .select('conversation_id, unread_count')
            .eq('user_id', currentUserId);

          if (basicErr) throw basicErr;
          memberships = basicMembers || [];

          // Merge local fallback pinned map
          const localMap = getLocalPinnedMap(currentUserId);
          Object.entries(localMap).forEach(([cId, pData]) => {
            pinnedByConvId.set(cId, pData);
          });
        }

        if (!memberships || memberships.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const conversationIds = memberships.map((m) => m.conversation_id);
        const unreadByConvId = Object.fromEntries(
          memberships.map((m) => [m.conversation_id, m.unread_count ?? 0])
        );

        // Batch fetch convos, other members with profiles, and latest messages simultaneously in PARALLEL
        const [convosResult, otherMembersResult, latestMessagesResult] = await Promise.all([
          supabase
            .from('conversations')
            .select('id, type, name, avatar_url, last_message_at')
            .in('id', conversationIds)
            .order('last_message_at', { ascending: false, nullsFirst: false }),
          supabase
            .from('conversation_members')
            .select(`
              conversation_id,
              user_id,
              profiles (
                display_name,
                username,
                avatar_url,
                status
              )
            `)
            .in('conversation_id', conversationIds)
            .neq('user_id', currentUserId),
          supabase
            .from('messages')
            .select('conversation_id, content, created_at, sender_id')
            .in('conversation_id', conversationIds)
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
        ]);

        if (convosResult.error) throw convosResult.error;
        const convos = convosResult.data;
        const otherMembers = otherMembersResult.data;
        const latestMessages = latestMessagesResult.data;

        const profileByConvId = new Map<string, {
          userId?: string;
          display_name: string;
          username: string;
          avatar_url: string | null;
          status: string | null;
        }>();

        (otherMembers ?? []).forEach((m) => {
          if (!profileByConvId.has(m.conversation_id) && m.profiles) {
            const p = m.profiles as unknown as {
              display_name: string;
              username: string;
              avatar_url: string | null;
              status: string | null;
            };
            profileByConvId.set(m.conversation_id, {
              userId: m.user_id,
              ...p,
            });
          }
        });

        const lastMsgByConvId = new Map<string, { content: string | null; at: string | null; isOwn: boolean }>();
        (latestMessages ?? []).forEach((msg) => {
          if (!lastMsgByConvId.has(msg.conversation_id)) {
            lastMsgByConvId.set(msg.conversation_id, {
              content: msg.content,
              at: msg.created_at,
              isOwn: msg.sender_id === currentUserId,
            });
          }
        });

        const items = (convos ?? []).map((conv) => {
          const profile = profileByConvId.get(conv.id);

          const name = conv.name ?? profile?.display_name ?? 'Unknown';
          const username = profile?.username ?? '';
          const avatar_url = conv.avatar_url ?? profile?.avatar_url ?? null;
          const status =
            (profile?.status as 'online' | 'away' | 'offline' | null) ??
            'offline';

          const lastMsg = lastMsgByConvId.get(conv.id) ?? {
            content: null,
            at: null,
            isOwn: false,
          };

          const pinInfo = pinnedByConvId.get(conv.id) || { is_pinned: false, pinned_at: null };

          return {
            id: conv.id,
            name,
            username,
            avatar_url,
            status,
            last_message_content: lastMsg.content,
            last_message_at: lastMsg.at ?? conv.last_message_at,
            last_message_is_own: lastMsg.isOwn,
            unread_count: unreadByConvId[conv.id] ?? 0,
            is_pinned: pinInfo.is_pinned,
            pinned_at: pinInfo.pinned_at,
          } satisfies ConversationItemData;
        });

        // Map to quickly lookup conversation type
        const convTypeById = new Map<string, string>();
        (convos ?? []).forEach((c) => {
          convTypeById.set(c.id, c.type);
        });

        // Deduplicate direct conversations that share the same participant
        // (Prevents historical duplicate split threads like 'Sun' and 'Oct 6' for 'metrd')
        const deduplicatedItems: ConversationItemData[] = [];
        const seenDirectPeers = new Map<string, number>(); // peerKey -> index in deduplicatedItems

        for (const item of items) {
          const convType = convTypeById.get(item.id) || 'direct';
          const profile = profileByConvId.get(item.id);
          const isDirect = convType === 'direct';
          const peerKey = isDirect
            ? (profile?.userId || (profile?.username ? `@${profile.username.toLowerCase()}` : null))
            : null;

          if (isDirect && peerKey) {
            if (seenDirectPeers.has(peerKey)) {
              const existingIdx = seenDirectPeers.get(peerKey)!;
              const existing = deduplicatedItems[existingIdx];

              // Priority:
              // 1. Currently active conversation ID (activeIdRef.current) always wins
              // 2. Conversation with more recent last_message_at
              // 3. Pinned conversation
              const isCurrentActive = item.id === activeIdRef.current;
              const isExistingActive = existing.id === activeIdRef.current;

              let preferCurrent = false;
              if (isCurrentActive) {
                preferCurrent = true;
              } else if (!isExistingActive) {
                const currentTime = item.last_message_at ? new Date(item.last_message_at).getTime() : 0;
                const existingTime = existing.last_message_at ? new Date(existing.last_message_at).getTime() : 0;
                if (currentTime > existingTime) {
                  preferCurrent = true;
                } else if (currentTime === existingTime && item.is_pinned && !existing.is_pinned) {
                  preferCurrent = true;
                }
              }

              // Merge unread counts and pinned state
              const mergedUnread = (existing.unread_count || 0) + (item.unread_count || 0);
              const mergedPinned = Boolean(existing.is_pinned || item.is_pinned);
              const mergedPinnedAt = existing.pinned_at || item.pinned_at;

              if (preferCurrent) {
                deduplicatedItems[existingIdx] = {
                  ...item,
                  unread_count: mergedUnread,
                  is_pinned: mergedPinned,
                  pinned_at: mergedPinnedAt,
                };
              } else {
                deduplicatedItems[existingIdx] = {
                  ...existing,
                  unread_count: mergedUnread,
                  is_pinned: mergedPinned,
                  pinned_at: mergedPinnedAt,
                };
              }
              continue;
            } else {
              seenDirectPeers.set(peerKey, deduplicatedItems.length);
            }
          }
          deduplicatedItems.push(item);
        }

        setConversations(sortByPinnedAndRecent(deduplicatedItems));
      } catch (err) {
        console.warn('[ConversationList] Failed to load conversations:', err);
        if (conversationsRef.current.length === 0) {
          setError(
            err instanceof Error ? err.message : 'Failed to load conversations'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [currentUserId, supabase]
  );

  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  useEffect(() => {
    loadConversations(false);
  }, [loadConversations]);

  /* ── realtime subscription ────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    const channelRef = { current: null as ReturnType<typeof supabase.channel> | null };

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.access_token) {
        return;
      }

      await supabase.realtime.setAuth(session.access_token);

      if (cancelled) return;

      const channel = supabase
        .channel('conversation-list-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const msg = payload.new as {
              id: string;
              conversation_id: string;
              content: string;
              created_at: string;
              sender_id: string;
            };

            setConversations((prev) => {
              const idx = prev.findIndex((c) => c.id === msg.conversation_id);

              if (idx === -1) {
                // Background refresh for newly created conversation
                loadConversationsRef.current(true);
                return prev;
              }

              const updated: ConversationItemData = {
                ...prev[idx],
                last_message_content: msg.content,
                last_message_at: msg.created_at,
                last_message_is_own: msg.sender_id === currentUserId,
              };

              const next = [...prev];
              next[idx] = updated;
              return sortByPinnedAndRecent(next);
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_members',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            const member = payload.new as {
              conversation_id: string;
              unread_count: number;
            };

            setConversations((prev) => {
              const idx = prev.findIndex(
                (c) => c.id === member.conversation_id
              );
              if (idx === -1) return prev;

              const isActive = member.conversation_id === activeIdRef.current;
              const unread_count = isActive ? 0 : member.unread_count;

              if (isActive && member.unread_count > 0) {
                // If active in foreground, clear the server counter immediately so refreshes don't desync
                supabase
                  .from('conversation_members')
                  .update({
                    unread_count: 0,
                    last_read_at: new Date().toISOString(),
                  })
                  .eq('conversation_id', member.conversation_id)
                  .eq('user_id', currentUserId)
                  .then(() => {});
              }

              if (prev[idx].unread_count === unread_count) return prev;

              const next = [...prev];
              next[idx] = { ...prev[idx], unread_count };
              return next;
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[Realtime] Conversation list subscription interrupted:', status, err);
          }
        });

      channelRef.current = channel;

      if (cancelled && channel) {
        supabase.removeChannel(channel);
      }
    }

    subscribe();

    // Fallback background polling (15s) when visible, tab returns, or network reconnects
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadConversationsRef.current(true);
      }
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadConversationsRef.current(true);
      }
    };

    const handleOnline = () => {
      loadConversationsRef.current(true);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId, supabase]);

  /* ── realtime typing tracking ─────────────────────────────────────────── */

  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const unsubscribe = subscribeToTyping(supabase, (payload) => {
      // Never show user's own typing as incoming
      if (payload.userId === currentUserId) return;

      if (payload.isTyping) {
        if (typingTimersRef.current[payload.conversationId]) {
          clearTimeout(typingTimersRef.current[payload.conversationId]);
        }
        setTypingMap((prev) => ({
          ...prev,
          [payload.conversationId]: true,
        }));
        // Auto-clear indicator after 3500ms inactivity timeout
        typingTimersRef.current[payload.conversationId] = setTimeout(() => {
          setTypingMap((prev) => {
            if (!prev[payload.conversationId]) return prev;
            const next = { ...prev };
            delete next[payload.conversationId];
            return next;
          });
        }, 3500);
      } else {
        if (typingTimersRef.current[payload.conversationId]) {
          clearTimeout(typingTimersRef.current[payload.conversationId]);
          delete typingTimersRef.current[payload.conversationId];
        }
        setTypingMap((prev) => {
          if (!prev[payload.conversationId]) return prev;
          const next = { ...prev };
          delete next[payload.conversationId];
          return next;
        });
      }
    });

    return () => {
      unsubscribe();
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
    };
  }, [supabase, currentUserId]);

  /* ── pin toggle handler ────────────────────────────────────────────────── */

  const handleTogglePin = useCallback(
    async (conversationId: string, currentPinned: boolean) => {
      const nextPinned = !currentPinned;
      const nextPinnedAt = nextPinned ? new Date().toISOString() : null;

      // 1. Optimistic UI update immediately
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev;
        const updated: ConversationItemData = {
          ...prev[idx],
          is_pinned: nextPinned,
          pinned_at: nextPinnedAt,
        };
        const next = [...prev];
        next[idx] = updated;
        return sortByPinnedAndRecent(next);
      });

      // 2. Persist to localStorage for immediate resilience across refreshes
      saveLocalPinned(currentUserId, conversationId, nextPinned, nextPinnedAt);

      // 3. Persist to Supabase database (conversation_members table)
      try {
        const { error: dbErr } = await supabase
          .from('conversation_members')
          .update({
            is_pinned: nextPinned,
            pinned_at: nextPinnedAt,
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUserId);

        if (dbErr) {
          console.warn(
            '[ConversationList] Note: Database column is_pinned update:',
            dbErr.message,
            '— apply supabase/migrations/016_add_conversation_pins.sql'
          );
        }
      } catch (err) {
        console.warn('[ConversationList] Network error persisting pin:', err);
      }
    },
    [currentUserId, supabase]
  );

  /* ── mark as read ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!activeId) return;

    supabase
      .from('conversation_members')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('conversation_id', activeId)
      .eq('user_id', currentUserId)
      .then(() => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, unread_count: 0 } : c
          )
        );
      });
  }, [activeId, currentUserId, supabase]);

  /* ── filtering ────────────────────────────────────────────────────────── */

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unread_count > 0 ? 1 : 0), 0);

  const filteredByTab = filterTab === 'unread'
    ? conversations.filter((c) => c.unread_count > 0)
    : conversations;

  const filtered = search.trim()
    ? filteredByTab.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.username.toLowerCase().includes(search.toLowerCase())
      )
    : filteredByTab;

  const handleNewConversation = () => {
    setStartingNew(true);
    router.push('/people');
    setTimeout(() => setStartingNew(false), 600);
  };

  /* ── render ───────────────────────────────────────────────────────────── */

  return (
    <div className="flex h-full flex-col bg-transparent select-none">
      {/* ── Modern Header: Signature Glass & Wine ──────────────────────── */}
      <div className="shrink-0 px-4 pb-3.5 pt-4 border-b border-black/[0.06] dark:border-white/10 bg-white/70 dark:bg-[#1E141B]/70 backdrop-blur-xl sm:px-5 sm:pb-4 sm:pt-5">
        {/* Title + Direct Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl sm:text-[22px] tracking-tight text-charcoal dark:text-foreground">
              Messages
            </h1>
            {unreadTotal > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-wine px-1.5 text-[10.5px] font-bold text-white shadow-xs">
                {unreadTotal}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              title="Your profile"
              aria-label="Your profile"
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-stone/80 bg-white dark:bg-[#2C2128] text-muted hover:text-charcoal dark:hover:text-foreground hover:bg-porcelain dark:hover:bg-[#342730] transition-[background-color,color,transform] duration-150 ease-out active:scale-95"
            >
              <User className="h-4 w-4" strokeWidth={1.8} />
            </Link>
            <Link
              href="/people"
              title="People directory"
              aria-label="People directory"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone/80 bg-white dark:bg-[#2C2128] text-muted hover:text-charcoal dark:hover:text-foreground hover:bg-porcelain dark:hover:bg-[#342730] transition-[background-color,color,transform] duration-150 ease-out active:scale-95"
            >
              <Users className="h-4 w-4" strokeWidth={1.8} />
            </Link>
            <button
              type="button"
              onClick={handleNewConversation}
              disabled={startingNew}
              title="New message"
              aria-label="New message"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-wine-hover active:scale-95 disabled:opacity-50"
            >
              {startingNew ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SquarePen className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* Search input with Nexus Command launcher */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            aria-label="Search messages"
            className="search-input w-full rounded-xl py-2 pl-9 pr-14 text-[13px] bg-[var(--field-bg,var(--surface))] dark:bg-[#241219] border border-[var(--border)] dark:border-white/10 text-charcoal dark:text-white placeholder:text-[var(--foreground-ghost)] dark:placeholder:text-white/40 shadow-2xs focus:border-wine/50 focus:ring-[1.5px] focus:ring-wine/15 transition-all outline-none"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search ? (
              <button
                key="clear-search-btn"
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="rounded p-1 text-muted hover:text-charcoal dark:hover:text-foreground transition-[color,transform] duration-120 ease-out active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                key="open-command-badge"
                type="button"
                onClick={openCommand}
                title="Nexus Command (Ctrl+K or ⌘K)"
                aria-label="Nexus Command (Ctrl+K or ⌘K)"
                className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10.5px] font-mono font-medium text-muted bg-porcelain dark:bg-wine/10 border border-stone/60 dark:border-wine/25 hover:border-wine/40 hover:text-wine dark:hover:text-[#F7B6C4] transition-colors"
              >
                ⌘K
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-3 flex items-center gap-5 border-b border-[var(--border)] px-0.5">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              'relative pb-2.5 text-[12px] font-semibold transition-colors duration-150',
              filterTab === 'all'
                ? 'text-wine dark:text-[#F3B3C2]'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
            )}
          >
            <span>All ({conversations.length})</span>
            {filterTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-wine dark:bg-[#F3B3C2]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('unread')}
            className={cn(
              'relative pb-2.5 text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors duration-150',
              filterTab === 'unread'
                ? 'text-wine dark:text-[#F3B3C2]'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
            )}
          >
            <span>Unread</span>
            {unreadTotal > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wine px-1 text-[10px] font-bold text-white tabular-nums">
                {unreadTotal}
              </span>
            )}
            {filterTab === 'unread' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-wine dark:bg-[#F3B3C2]" />
            )}
          </button>
        </div>
      </div>

      {/* ── List body ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-2.5 py-2 space-y-0.5 pb-28 lg:pb-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {error && (
          <div className="mb-3 rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2.5 text-[12.5px] text-wine dark:text-[#F3B3C2]">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadConversations(false)}
              className="mt-1 font-semibold text-wine dark:text-[#F3B3C2] underline underline-offset-2 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {loading && conversations.length === 0 ? (
          <LoadingSkeleton />
        ) : filtered.length > 0 ? (
          <ul role="list" className="space-y-0.5 divide-y divide-stone-subtle/30 dark:divide-white/[0.04]">
            {filtered.map((conv) => (
              <li key={conv.id}>
                <ConversationItem
                  conversation={conv}
                  isActive={conv.id === activeId}
                  isTyping={Boolean(typingMap[conv.id])}
                  onTogglePin={handleTogglePin}
                  onOpenContextMenu={(id, x, y) => setContextMenu({ conversationId: id, x, y })}
                />
              </li>
            ))}
          </ul>
        ) : search ? (
          <SearchEmptyState query={search} onClear={() => setSearch('')} />
        ) : filterTab === 'unread' ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-muted dark:text-muted-foreground">
            <MessageSquare className="mb-2 h-6 w-6 text-muted-faint dark:text-[#7A6A74]" strokeWidth={1.7} />
            <p className="text-sm font-medium text-charcoal dark:text-foreground">No unread messages</p>
            <p className="mt-1 text-[12px] text-muted dark:text-muted-foreground">You are all caught up.</p>
          </div>
        ) : (
          <EmptyState onNewConversation={handleNewConversation} />
        )}

        {/* Discovery Card when fewer than 3 conversations exist */}
        {!loading && !search && filterTab === 'all' && conversations.length < 3 && (
          <div className="mt-3.5 px-0.5">
            <Link
              href="/communities"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-br from-[#241219]/90 via-[#1C0D13]/90 to-[#2A141E]/90 border border-wine/25 dark:border-white/10 shadow-sm transition-all duration-150 hover:border-wine/40 active:scale-[0.99]"
              title="Explore verified salons and communities"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine text-white shadow-xs shrink-0">
                  <Compass className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/95 truncate">Explore Nexus</p>
                  <p className="text-[11px] text-white/70 truncate">Search a private @handle or explore verified salons &rarr;</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#F3B3C2] shrink-0 transition-transform group-hover:translate-x-0.5 ml-2" />
            </Link>
          </div>
        )}
      </div>

      {/* Conversation Context Menu (Right-Click Desktop / Press-and-Hold Mobile) */}
      {contextMenu && (() => {
        const targetConv = conversations.find((c) => c.id === contextMenu.conversationId);
        if (!targetConv) return null;

        const menuWidth = 200;
        const menuHeight = 110;
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 400;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const posX = Math.max(12, Math.min(contextMenu.x, screenW - menuWidth - 12));
        const posY = Math.max(12, Math.min(contextMenu.y, screenH - menuHeight - 12));

        return (
          <>
            {/* Transparent backdrop to catch outside clicks and dismiss */}
            <div
              className="fixed inset-0 z-50 bg-black/10 dark:bg-black/30 backdrop-blur-[1px] nx-backdrop-in"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />

            {/* Menu Panel */}
            <div
              role="menu"
              aria-label={`Options for ${targetConv.name}`}
              style={{ left: `${posX}px`, top: `${posY}px` }}
              className="fixed z-50 min-w-[200px] rounded-2xl bg-white/95 dark:bg-[#201B22]/95 backdrop-blur-xl border border-stone-subtle/80 dark:border-white/10 shadow-2xl p-1.5 nx-popover-enter select-none text-charcoal dark:text-stone"
            >
              {/* Header / Conversation Identifier */}
              <div className="px-2.5 py-1.5 border-b border-stone-subtle/40 dark:border-white/[0.06] mb-1">
                <p className="text-[12px] font-semibold text-charcoal dark:text-stone truncate">
                  {targetConv.name}
                </p>
              </div>

              {/* Action 1: Pin / Unpin */}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  handleTogglePin(targetConv.id, Boolean(targetConv.is_pinned));
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-charcoal dark:text-stone hover:bg-wine/10 dark:hover:bg-white/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
              >
                {targetConv.is_pinned ? (
                  <>
                    <PinOff className="h-4 w-4 text-wine dark:text-[#F3B3C2]" />
                    <span>Unpin conversation</span>
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 text-wine dark:text-[#F3B3C2] fill-wine/20 dark:fill-[#F3B3C2]/20" />
                    <span>Pin conversation</span>
                  </>
                )}
                <span className="ml-auto text-[10.5px] font-mono text-muted/70">P</span>
              </button>

              {/* Action 2: Open Conversation */}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  router.push(`/conversations/${targetConv.id}`);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-charcoal dark:text-stone hover:bg-wine/10 dark:hover:bg-white/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open conversation</span>
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <ul role="list" className="space-y-1.5" aria-busy="true" aria-label="Loading conversations">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-stone/60 dark:border-[#382832] bg-white/70 dark:bg-[#251D22] p-3.5 shadow-sm"
          style={{ opacity: 1 - i * 0.18 }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-stone/70 dark:bg-[#3B2C34]" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-28 animate-pulse rounded bg-stone/70 dark:bg-[#3B2C34]" />
                <div className="h-2.5 w-10 animate-pulse rounded bg-stone/50 dark:bg-[#31242C]" />
              </div>
              <div className="h-2.5 w-3/4 animate-pulse rounded bg-stone/50 dark:bg-[#31242C]" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ onNewConversation }: { onNewConversation: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone dark:border-[#3B2C34] bg-white/60 dark:bg-[#251D22]/60 px-6 py-16 text-center shadow-sm">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
        <MessageSquare className="h-6 w-6" strokeWidth={2} />
      </div>
      <p className="text-base font-semibold text-charcoal dark:text-foreground">
        No messages yet
      </p>
      <p className="mt-1 max-w-[220px] text-[13px] leading-relaxed text-muted dark:text-muted-foreground">
        Connect with colleagues to start your first conversation.
      </p>
      <button
        type="button"
        onClick={onNewConversation}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-wine px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-wine-hover active:scale-95"
      >
        <SquarePen className="h-3.5 w-3.5" />
        New message
      </button>
    </div>
  );
}

function SearchEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <Search className="mb-2.5 h-5 w-5 text-muted dark:text-muted-foreground" strokeWidth={1.8} />
      <p className="text-sm font-semibold text-charcoal dark:text-foreground [overflow-wrap:anywhere]">
        No results for &ldquo;{query}&rdquo;
      </p>
      <p className="mt-1 text-[12px] text-muted dark:text-muted-foreground">
        Check the spelling or try another name.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 text-[12.5px] font-medium text-wine dark:text-[#F3B3C2] underline underline-offset-4 transition-opacity hover:opacity-80"
      >
        Clear search
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageItem, type MessageWithReactions } from './message-item';
import { MessageInput, type ReplyingTo, type EditingMessage } from './message-input';
import { DeleteMessageModal } from './delete-message-modal';
import { EchoNoteModal } from '@/components/echoes/echo-note-modal';
import { useSettings } from '@/lib/settings/settings-context';
import { playNotificationSound } from '@/lib/utils/audio';
import { EmptyConversation } from './empty-conversation';
import { Search, X, ArrowDown } from 'lucide-react';
import type { MessageReaction } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { subscribeToTyping } from '@/lib/realtime/typing-channel';

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageWithReactions[];
  participantName?: string;
  participantAvatar?: string | null;
  participantUsername?: string;
  conversationType?: 'direct' | 'group';
  onMessagesChange?: (messages: MessageWithReactions[]) => void;
  searchOpen?: boolean;
  onCloseSearch?: () => void;
}

function closeInTime(a: MessageWithReactions, b: MessageWithReactions): boolean {
  const diff = Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return diff < 5 * 60 * 1000 && a.sender_id === b.sender_id;
}

function getCalendarDateString(isoDate: string | undefined | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return isNaN(d.getTime()) ? '' : d.toDateString();
}

function dayLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  // Compare calendar dates, not elapsed time
  const todayStr = now.toDateString();
  const msgStr = d.toDateString();
  if (msgStr === todayStr) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (msgStr === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// In-memory cache for echoes bookmark map across conversation switches
let memoryEchoesCache: { userId: string; echoes: Map<string, { id: string; note: string | null }> } | null = null;

export function MessageList({
  conversationId,
  currentUserId,
  initialMessages,
  participantName = 'Participant',
  participantAvatar,
  participantUsername,
  conversationType = 'direct',
  onMessagesChange,
  searchOpen = false,
  onCloseSearch,
}: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithReactions[]>(initialMessages);
  const messagesRef = useRef<MessageWithReactions[]>(initialMessages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Synchronize messages if initialMessages prop updates (e.g. server revalidation)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<MessageWithReactions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [echoesMap, setEchoesMap] = useState<Map<string, { id: string; note: string | null }>>(() => {
    if (memoryEchoesCache && memoryEchoesCache.userId === currentUserId) {
      return memoryEchoesCache.echoes;
    }
    return new Map();
  });
  const [echoModalMessage, setEchoModalMessage] = useState<MessageWithReactions | null>(null);
  const [isSavingEcho, setIsSavingEcho] = useState(false);
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const targetMessageId = searchParams?.get('messageId');

  // Realtime typing indicator tracking for this conversation
  const [isOtherParticipantTyping, setIsOtherParticipantTyping] = useState(false);
  const otherTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const client = getSupabase();
    const unsubscribe = subscribeToTyping(client, (payload) => {
      if (payload.conversationId === conversationId && payload.userId !== currentUserId) {
        if (payload.isTyping) {
          if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current);
          setIsOtherParticipantTyping(true);
          // Inactivity auto-dismissal
          otherTypingTimerRef.current = setTimeout(() => {
            setIsOtherParticipantTyping(false);
          }, 3500);
        } else {
          if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current);
          setIsOtherParticipantTyping(false);
        }
      }
    });

    return () => {
      unsubscribe();
      if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current);
    };
  }, [conversationId, currentUserId]);

  // Keep typing indicator bubble visible if user is reading at the bottom
  useEffect(() => {
    if (isOtherParticipantTyping && isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOtherParticipantTyping]);

  useEffect(() => {
    let isMounted = true;
    async function loadEchoes() {
      // If already cached for this user, avoid duplicate network roundtrips
      if (memoryEchoesCache && memoryEchoesCache.userId === currentUserId) {
        return;
      }
      try {
        const res = await fetch('/api/echoes');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.echoes)) {
            const map = new Map<string, { id: string; note: string | null }>();
            for (const e of data.echoes) {
              map.set(e.messageId, { id: e.id, note: e.note });
            }
            memoryEchoesCache = { userId: currentUserId, echoes: map };
            setEchoesMap(map);
          }
        }
      } catch {
        // Safe fallback
      }
    }
    loadEchoes();
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const handleSaveEcho = useCallback(
    async (note: string) => {
      if (!echoModalMessage) return;
      setIsSavingEcho(true);
      try {
        const res = await fetch('/api/echoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: echoModalMessage.id, note }),
        });
        if (res.ok) {
          const data = await res.json();
          setEchoesMap((prev) => {
            const next = new Map(prev);
            next.set(echoModalMessage.id, {
              id: data.echo?.id || 'temp-' + Date.now(),
              note: data.echo?.note || note,
            });
            if (memoryEchoesCache) memoryEchoesCache.echoes = next;
            return next;
          });
          setEchoModalMessage(null);
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save echo.');
        }
      } finally {
        setIsSavingEcho(false);
      }
    },
    [echoModalMessage]
  );

  const handleUnsaveEcho = useCallback(async () => {
    if (!echoModalMessage) return;
    const existing = echoesMap.get(echoModalMessage.id);
    if (!existing) return;
    setIsSavingEcho(true);
    try {
      const res = await fetch(`/api/echoes/${existing.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEchoesMap((prev) => {
          const next = new Map(prev);
          next.delete(echoModalMessage.id);
          if (memoryEchoesCache) memoryEchoesCache.echoes = next;
          return next;
        });
        setEchoModalMessage(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to remove echo.');
      }
    } finally {
      setIsSavingEcho(false);
    }
  }, [echoModalMessage, echoesMap]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const prevMessagesCountRef = useRef(messages.length);
  const prevLastMessageIdRef = useRef(messages[messages.length - 1]?.id);
  const isAtBottomRef = useRef(true);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  const handleScroll = useCallback(() => {
    setActiveActionMessageId(null);
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 100;
    isAtBottomRef.current = isNearBottom;
    if (isNearBottom) {
      setHasNewMessagesBelow(false);
    }
  }, []);

  const animatedIdsRef = useRef<Set<string>>(
    new Set((initialMessages || []).map((m) => m.id))
  );

  const channelRef = useRef<RealtimeChannel | null>(null);

  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  // Notify parent of message state changes
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // Reset search when search bar is closed
  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Scroll manager with position preservation and reduced-motion support
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prevCount = prevMessagesCountRef.current;
    const prevLastId = prevLastMessageIdRef.current;
    const lastMessage = messages[messages.length - 1];
    const lastId = lastMessage?.id;
    const countIncreased = messages.length > prevCount;
    const isNewMessageAppended = countIncreased && lastId !== prevLastId;
    const isOlderMessagesPrepended = countIncreased && lastId === prevLastId;
    const isOwnLast = lastMessage?.sender_id === currentUserIdRef.current;

    // Update refs for next update cycle
    prevMessagesCountRef.current = messages.length;
    prevLastMessageIdRef.current = lastId;

    // 1. Initial render or conversation switch: jump to bottom instantly (no animation lag)
    if (isFirstRender.current) {
      el.scrollTop = el.scrollHeight;
      isFirstRender.current = false;
      return;
    }

    // 2. Older messages prepended to top: preserve exact viewport position
    if (isOlderMessagesPrepended && scrollSnapshotRef.current) {
      const heightDelta = el.scrollHeight - scrollSnapshotRef.current.scrollHeight;
      el.scrollTop = scrollSnapshotRef.current.scrollTop + heightDelta;
      scrollSnapshotRef.current = null;
      return;
    }

    // 3. New message added at the bottom:
    if (isNewMessageAppended) {
      // If user sent the message: always scroll to bottom immediately
      if (isOwnLast) {
        el.scrollTop = el.scrollHeight;
        setHasNewMessagesBelow(false);
        return;
      }

      // If user is already near bottom (reading latest): follow along
      if (isAtBottomRef.current) {
        el.scrollTop = el.scrollHeight;
        setHasNewMessagesBelow(false);
        return;
      }

      // User is reading history higher up: DO NOT STEAL SCROLL POSITION!
      setHasNewMessagesBelow(true);
      return;
    }

    // 4. Edits, reactions, echoes, or deletes:
    // If user was already at bottom, stay pinned to bottom; otherwise do not move
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Realtime subscription: Messages INSERT, UPDATE, DELETE + Broadcasts for new messages, reactions, edits, deletes
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: NodeJS.Timeout | null = null;

    async function subscribe() {
      const client = getSupabase();

      // Clean up previous channel if reconnecting or re-subscribing
      if (channelRef.current) {
        try {
          client.removeChannel(channelRef.current);
        } catch {
          // ignore cleanup error
        }
        channelRef.current = null;
      }

      // 0. Authenticate Realtime WebSocket with current session JWT
      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.access_token) {
          await client.realtime.setAuth(session.access_token);
        }
      } catch (err) {
        console.warn('[Realtime] Failed to set auth token:', err);
      }

      if (cancelled) return;

      const channel = client
        .channel(`conversation-${conversationId}`)
        // 1. Realtime Broadcast for New Messages (Sub-30ms instant sync)
        .on('broadcast', { event: 'new_message' }, (eventPayload) => {
          const incoming = eventPayload.payload as MessageWithReactions;
          // Defensive verification of broadcast payload
          if (
            !incoming ||
            incoming.conversation_id !== conversationId ||
            incoming.sender_id === currentUserIdRef.current ||
            typeof incoming.id !== 'string' ||
            typeof incoming.content !== 'string' ||
            incoming.content.length > 5000
          ) {
            return;
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) {
              return prev;
            }

            if (settingsRef.current.notifications.soundEnabled) {
              playNotificationSound();
            }
            if (
              settingsRef.current.notifications.desktopNotifications &&
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted' &&
              document.hidden
            ) {
              const body = settingsRef.current.notifications.includePreviewInNotification
                ? incoming.content
                : 'New message received';
              try {
                new Notification('Nexus.talks', { body, icon: '/favicon.ico' });
              } catch {
                // notification blocked
              }
            }

            return [...prev, incoming];
          });
        })
        // 2. Database Postgres Changes for INSERT (Database-level sync)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const rawIncoming = payload.new as MessageWithReactions;
            if (!rawIncoming || !rawIncoming.id) return;

            setMessages((prev) => {
              if (prev.some((m) => m.id === rawIncoming.id)) {
                return prev;
              }

              // If incoming is own message and matches an optimistic temp message, replace it
              if (rawIncoming.sender_id === currentUserIdRef.current) {
                const tempIndex = prev.findIndex(
                  (m) =>
                    m.id.startsWith('temp_') &&
                    m.sender_id === rawIncoming.sender_id &&
                    m.content === rawIncoming.content
                );
                if (tempIndex !== -1) {
                  const next = [...prev];
                  next[tempIndex] = {
                    ...rawIncoming,
                    message_reactions: prev[tempIndex].message_reactions || [],
                    reply_to: prev[tempIndex].reply_to || null,
                  };
                  return next;
                }
              }

              // Resolve reply_to if not present in raw table payload
              let resolvedReplyTo = rawIncoming.reply_to || null;
              if (!resolvedReplyTo && rawIncoming.reply_to_id) {
                const original = prev.find((m) => m.id === rawIncoming.reply_to_id);
                if (original) {
                  resolvedReplyTo = {
                    id: original.id,
                    content: original.content,
                    sender_id: original.sender_id,
                    sender_name: original.sender_id === currentUserIdRef.current ? 'You' : participantName,
                  };
                }
              }

              const incoming: MessageWithReactions = {
                ...rawIncoming,
                reply_to: resolvedReplyTo,
                message_reactions: rawIncoming.message_reactions || [],
              };

              if (incoming.sender_id !== currentUserIdRef.current) {
                if (settingsRef.current.notifications.soundEnabled) {
                  playNotificationSound();
                }
                if (
                  settingsRef.current.notifications.desktopNotifications &&
                  typeof window !== 'undefined' &&
                  'Notification' in window &&
                  Notification.permission === 'granted' &&
                  document.hidden
                ) {
                  const body = settingsRef.current.notifications.includePreviewInNotification
                    ? incoming.content
                    : 'New message received';
                  try {
                    new Notification('Nexus.talks', { body, icon: '/favicon.ico' });
                  } catch {
                    // notification blocked
                  }
                }
              }

              return [...prev, incoming];
            });
          }
        )
        // 2. Realtime Broadcast for Reactions (Sub-30ms instant sync)
        .on('broadcast', { event: 'reaction_update' }, (eventPayload) => {
          const { messageId, userId, emoji } = eventPayload.payload as {
            messageId: string;
            userId: string;
            emoji: string;
          };

          if (userId === currentUserIdRef.current) return; // Ignore own echo

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              const existing = m.message_reactions || [];
              const userReaction = existing.find((r) => r.user_id === userId);

              let nextReactions: MessageReaction[];
              if (userReaction) {
                if (userReaction.emoji === emoji) {
                  nextReactions = existing.filter((r) => r.user_id !== userId);
                } else {
                  nextReactions = existing.map((r) =>
                    r.user_id === userId ? { ...r, emoji } : r
                  );
                }
              } else {
                nextReactions = [
                  ...existing,
                  {
                    id: `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    message_id: messageId,
                    user_id: userId,
                    emoji,
                    created_at: new Date().toISOString(),
                  },
                ];
              }

              return { ...m, message_reactions: nextReactions };
            })
          );
        })
        // 3. Realtime Broadcast for Message Edits (Sub-30ms instant sync)
        .on('broadcast', { event: 'message_edit' }, (eventPayload) => {
          const { messageId, content, edited_at, userId } = eventPayload.payload as {
            messageId: string;
            content: string;
            edited_at: string;
            userId: string;
          };

          if (userId === currentUserIdRef.current) return; // Ignore own echo

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === messageId) {
                return { ...m, content, edited_at };
              }
              if (m.reply_to?.id === messageId) {
                return {
                  ...m,
                  reply_to: { ...m.reply_to, content },
                };
              }
              return m;
            })
          );
        })
        // 4. Realtime Broadcast for Message Deletions (Sub-30ms instant sync)
        .on('broadcast', { event: 'message_delete' }, (eventPayload) => {
          const { messageId, userId } = eventPayload.payload as {
            messageId: string;
            userId: string;
          };

          if (userId === currentUserIdRef.current) return; // Ignore own echo

          setMessages((prev) =>
            prev
              .filter((m) => m.id !== messageId)
              .map((m) =>
                m.reply_to && m.reply_to.id === messageId
                  ? {
                      ...m,
                      reply_to: {
                        id: m.reply_to.id,
                        sender_id: m.reply_to.sender_id,
                        sender_name: m.reply_to.sender_name,
                        content: 'Original message was deleted',
                        deleted_at: new Date().toISOString(),
                      },
                    }
                  : m
              )
          );

          setReplyingTo((curr) => (curr?.id === messageId ? null : curr));
          setEditingMessage((curr) => (curr?.id === messageId ? null : curr));
        })
        // 5. Fallback Postgres changes for message_reactions
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
          },
          (payload) => {
            const record = (payload.new || payload.old) as { message_id?: string };
            if (!record?.message_id) return;

            // Re-fetch reactions for that specific message
            getSupabase()
              .from('message_reactions')
              .select('id, message_id, user_id, emoji, created_at')
              .eq('message_id', record.message_id)
              .then(({ data }) => {
                if (data) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === record.message_id
                        ? { ...m, message_reactions: data }
                        : m
                    )
                  );
                }
              });
          }
        )
        // 6. Fallback Postgres changes for messages UPDATE (soft-deletions and edits)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const updated = payload.new as MessageWithReactions;
            if (updated.deleted_at) {
              setMessages((prev) =>
                prev
                  .filter((m) => m.id !== updated.id)
                  .map((m) =>
                    m.reply_to && m.reply_to.id === updated.id
                      ? {
                          ...m,
                          reply_to: {
                            id: m.reply_to.id,
                            sender_id: m.reply_to.sender_id,
                            sender_name: m.reply_to.sender_name,
                            content: 'Original message was deleted',
                            deleted_at: updated.deleted_at,
                          },
                        }
                      : m
                  )
              );
              setReplyingTo((curr) => (curr?.id === updated.id ? null : curr));
              setEditingMessage((curr) => (curr?.id === updated.id ? null : curr));
            } else {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === updated.id) {
                    return { ...m, content: updated.content, edited_at: updated.edited_at };
                  }
                  if (m.reply_to?.id === updated.id) {
                    return {
                      ...m,
                      reply_to: { ...m.reply_to, content: updated.content },
                    };
                  }
                  return m;
                })
              );
            }
          }
        )
        // 7. Fallback Postgres changes for messages DELETE
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const oldRecord = payload.old as { id?: string };
            if (oldRecord?.id) {
              setMessages((prev) =>
                prev
                  .filter((m) => m.id !== oldRecord.id)
                  .map((m) =>
                    m.reply_to && m.reply_to.id === oldRecord.id
                      ? {
                          ...m,
                          reply_to: {
                            id: m.reply_to.id,
                            sender_id: m.reply_to.sender_id,
                            sender_name: m.reply_to.sender_name,
                            content: 'Original message was deleted',
                            deleted_at: new Date().toISOString(),
                          },
                        }
                      : m
                  )
              );
              setReplyingTo((curr) => (curr?.id === oldRecord.id ? null : curr));
              setEditingMessage((curr) => (curr?.id === oldRecord.id ? null : curr));
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // Channel is actively listening
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.warn('[Realtime] Subscription interrupted:', conversationId, status, err);
            if (!cancelled) {
              if (reconnectTimer) clearTimeout(reconnectTimer);
              reconnectTimer = setTimeout(() => {
                if (!cancelled) subscribe();
              }, 3000);
            }
          }
        });

      if (cancelled) {
        if (channel) {
          client.removeChannel(channel);
        }
        channelRef.current = null;
      } else {
        channelRef.current = channel;
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (channelRef.current) {
        getSupabase().removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, participantName]);

  // Graceful catch-up revalidation on window focus or network reconnect
  useEffect(() => {
    let isCancelled = false;

    async function revalidateLatest() {
      if (document.hidden) return;
      const client = getSupabase();
      const currentMsgs = messagesRef.current;
      const lastMsg = currentMsgs[currentMsgs.length - 1];
      if (!lastMsg) return;

      try {
        const { data } = await client
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            type,
            reply_to_id,
            created_at,
            edited_at,
            deleted_at,
            reply_to:reply_to_id (
              id,
              content,
              sender_id,
              deleted_at
            ),
            message_reactions (
              id,
              message_id,
              user_id,
              emoji,
              created_at
            )
          `)
          .eq('conversation_id', conversationId)
          .gt('created_at', lastMsg.created_at)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (!isCancelled && data && data.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = (data as unknown as MessageWithReactions[]).filter(
              (m) => !existingIds.has(m.id)
            );
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
        }
      } catch {
        // Safe fallback
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        revalidateLatest();
      }
    };

    const handleOnline = () => {
      revalidateLatest();
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    // Intelligent adaptive polling fallback (5s) while conversation is actively open
    // Guarantees delivery even if Supabase Realtime WebSocket drops or times out
    const interval = setInterval(() => {
      revalidateLatest();
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [conversationId]);

  // ── Jump to original message handler ──────────────────────────────────────
  const handleJumpToMessage = useCallback((targetId: string) => {
    const el = document.getElementById(`message-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1800);
    } else {
      setError('Original message is earlier in conversation history or unavailable.');
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  // Jump to URL query target message if present
  useEffect(() => {
    if (targetMessageId && messages.some((m) => m.id === targetMessageId)) {
      const timer = setTimeout(() => {
        handleJumpToMessage(targetMessageId);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [targetMessageId, messages, handleJumpToMessage]);

  // ── Reply handler ─────────────────────────────────────────────────────────
  const handleReply = useCallback(
    (msg: MessageWithReactions) => {
      const isOwn = msg.sender_id === currentUserId;
      setEditingMessage(null); // Clear editing mode when replying
      setReplyingTo({
        id: msg.id,
        senderName: isOwn ? 'You' : participantName,
        content: msg.content,
      });
    },
    [currentUserId, participantName]
  );

  // ── Edit Handlers ──────────────────────────────────────────────────────────
  const handleStartEdit = useCallback(
    (msg: MessageWithReactions) => {
      if (msg.sender_id !== currentUserId) return;
      setReplyingTo(null); // Clear reply mode when editing
      setEditingMessage({
        id: msg.id,
        content: msg.content,
      });
    },
    [currentUserId]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (messageId: string, newContent: string) => {
      const trimmed = newContent.trim();
      if (!trimmed) return;

      const previousMessage = messages.find((m) => m.id === messageId);
      if (!previousMessage || previousMessage.content === trimmed) {
        setEditingMessage(null);
        return;
      }

      const editedAt = new Date().toISOString();

      // 1. Optimistic UI update immediately
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return { ...m, content: trimmed, edited_at: editedAt };
          }
          if (m.reply_to?.id === messageId) {
            return {
              ...m,
              reply_to: { ...m.reply_to, content: trimmed },
            };
          }
          return m;
        })
      );

      setEditingMessage(null);

      // 2. Broadcast edit to participants (<30ms)
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_edit',
          payload: {
            messageId,
            content: trimmed,
            edited_at: editedAt,
            userId: currentUserId,
          },
        });
      }

      // 3. API mutation
      try {
        const res = await fetch(`/api/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: trimmed }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Failed to update message' }));
          throw new Error(errData.error || 'Failed to update message');
        }

        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, ...data.message } : m))
          );
        }
      } catch (err: unknown) {
        // Rollback on failure
        const errorMsg = err instanceof Error ? err.message : 'Failed to save edit';
        setError(errorMsg);
        setTimeout(() => setError(null), 4000);

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) {
              return { ...m, content: previousMessage.content, edited_at: previousMessage.edited_at };
            }
            if (m.reply_to?.id === messageId) {
              return {
                ...m,
                reply_to: { ...m.reply_to, content: previousMessage.content },
              };
            }
            return m;
          })
        );
        // Re-open editor with the failed draft so user does not lose input
        setEditingMessage({ id: messageId, content: trimmed });
      }
    },
    [messages, currentUserId]
  );

  // ── Delete Handlers ────────────────────────────────────────────────────────
  const handlePromptDelete = useCallback(
    (msg: MessageWithReactions) => {
      if (msg.sender_id !== currentUserId) return;
      setDeleteError(null);
      setDeletingMessage(msg);
    },
    [currentUserId]
  );

  const handleCancelDelete = useCallback(() => {
    setDeletingMessage(null);
    setDeleteError(null);
    setIsDeleting(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingMessage) return;
    const targetId = deletingMessage.id;
    const backupMsg = deletingMessage;

    setIsDeleting(true);
    setDeleteError(null);

    // 1. Optimistic removal from message state
    setMessages((prev) =>
      prev
        .filter((m) => m.id !== targetId)
        .map((m) =>
          m.reply_to && m.reply_to.id === targetId
            ? {
                ...m,
                reply_to: {
                  id: m.reply_to.id,
                  sender_id: m.reply_to.sender_id,
                  sender_name: m.reply_to.sender_name,
                  content: 'Original message was deleted',
                  deleted_at: new Date().toISOString(),
                },
              }
            : m
        )
    );

    // If currently replying to or editing this message, clear that state
    setReplyingTo((curr) => (curr?.id === targetId ? null : curr));
    setEditingMessage((curr) => (curr?.id === targetId ? null : curr));

    // 2. Broadcast deletion to participants (<30ms)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message_delete',
        payload: {
          messageId: targetId,
          userId: currentUserId,
        },
      });
    }

    // 3. API mutation
    try {
      const res = await fetch(`/api/messages/${targetId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to delete message' }));
        throw new Error(errData.error || 'Failed to delete message');
      }

      setDeletingMessage(null);
      setIsDeleting(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete message';
      setDeleteError(errorMsg);
      setIsDeleting(false);

      // Rollback: restore deleted message to state
      setMessages((prev) => {
        if (prev.some((m) => m.id === targetId)) return prev;
        const restored = [...prev, backupMsg].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return restored;
      });
    }
  }, [deletingMessage, currentUserId]);

  // ── Toggle Reaction handler (Optimistic UI + Broadcast + API Sync) ────────
  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      // 1. Optimistic local state update in 0ms
      let previousReactions: MessageReaction[] = [];

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          previousReactions = m.message_reactions || [];
          const userReaction = previousReactions.find((r) => r.user_id === currentUserId);

          let nextReactions: MessageReaction[];
          if (userReaction) {
            if (userReaction.emoji === emoji) {
              // Toggle off
              nextReactions = previousReactions.filter((r) => r.user_id !== currentUserId);
            } else {
              // Switch emoji
              nextReactions = previousReactions.map((r) =>
                r.user_id === currentUserId ? { ...r, emoji } : r
              );
            }
          } else {
            // Add reaction
            nextReactions = [
              ...previousReactions,
              {
                id: `opt_${Date.now()}`,
                message_id: messageId,
                user_id: currentUserId,
                emoji,
                created_at: new Date().toISOString(),
              },
            ];
          }

          return { ...m, message_reactions: nextReactions };
        })
      );

      // 2. Broadcast to other active clients instantly (<30ms)
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'reaction_update',
          payload: { messageId, userId: currentUserId, emoji },
        });
      }

      // 3. Persist to Supabase via atomic API endpoint
      try {
        const res = await fetch('/api/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji }),
        });

        if (!res.ok) {
          throw new Error('Failed to update reaction on server');
        }

        const data = await res.json();
        if (data.reactions) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, message_reactions: data.reactions } : m
            )
          );
        }
      } catch {
        // Rollback optimistic update on server error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, message_reactions: previousReactions } : m
          )
        );
        setError('Failed to update reaction. Please try again.');
        setTimeout(() => setError(null), 3000);
      }
    },
    [currentUserId]
  );

  // ── Send message handler ──────────────────────────────────────────────────
  const handleSend = async (content: string, replyToId?: string | null) => {
    const tempId = `temp_${Date.now()}`;
    const originalMsg = replyToId ? messages.find((m) => m.id === replyToId) : null;

    const optimisticMsg: MessageWithReactions = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      type: 'text',
      status: 'sending',
      reply_to_id: replyToId || null,
      edited_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      reply_to: originalMsg
        ? {
            id: originalMsg.id,
            content: originalMsg.content,
            sender_id: originalMsg.sender_id,
            sender_name: originalMsg.sender_id === currentUserId ? 'You' : participantName,
          }
        : null,
      message_reactions: [],
    };

    // Optimistically add to message state immediately
    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);

    try {
      const { data, error: insertError } = await getSupabase()
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
          type: 'text',
          reply_to_id: replyToId || null,
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          type,
          reply_to_id,
          created_at,
          edited_at,
          deleted_at,
          reply_to:reply_to_id (
            id,
            content,
            sender_id,
            deleted_at
          )
        `)
        .single();

      if (insertError) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: 'failed', failedError: insertError.message } : m
          )
        );
        setError(insertError.message);
        return;
      }

      if (data) {
        const resolvedReplyTo = Array.isArray(data.reply_to)
          ? data.reply_to[0]
          : data.reply_to;
        const serverMsg: MessageWithReactions = {
          ...(data as unknown as MessageWithReactions),
          status: 'sent',
          reply_to: resolvedReplyTo || null,
          message_reactions: [],
        };

        setMessages((prev) => {
          const tempIndex = prev.findIndex((m) => m.id === tempId);
          if (tempIndex !== -1) {
            const next = [...prev];
            next[tempIndex] = serverMsg;
            return next;
          }
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, serverMsg];
        });

        // Broadcast to other active clients instantly (<30ms)
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: serverMsg,
          });
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: 'failed', failedError: 'Network connection issue' } : m
        )
      );
      setError('Failed to send message. Please tap retry.');
    }
  };

  // ── Retry failed message handler ──────────────────────────────────────────
  const handleRetryMessage = useCallback(
    async (failedMsg: MessageWithReactions) => {
      const tempId = failedMsg.id;

      // Mark as sending again
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sending', failedError: undefined } : m))
      );

      try {
        const { data, error: insertError } = await getSupabase()
          .from('messages')
          .insert({
            conversation_id: failedMsg.conversation_id,
            sender_id: currentUserId,
            content: failedMsg.content,
            type: failedMsg.type || 'text',
            reply_to_id: failedMsg.reply_to_id || null,
          })
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            type,
            reply_to_id,
            created_at,
            edited_at,
            deleted_at,
            reply_to:reply_to_id (
              id,
              content,
              sender_id,
              deleted_at
            )
          `)
          .single();

        if (insertError) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, status: 'failed', failedError: insertError.message } : m
            )
          );
          setError(insertError.message);
          return;
        }

        if (data) {
          const resolvedReplyTo = Array.isArray(data.reply_to) ? data.reply_to[0] : data.reply_to;
          const serverMsg: MessageWithReactions = {
            ...(data as unknown as MessageWithReactions),
            status: 'sent',
            reply_to: resolvedReplyTo || null,
            message_reactions: [],
          };

          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? serverMsg : m))
          );

          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: serverMsg,
            });
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: 'failed', failedError: 'Network error. Please try again.' } : m
          )
        );
        setError('Failed to send message. Please try again.');
      }
    },
    [currentUserId]
  );

  const handleDismissFailedMessage = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();
  const filteredMessages = cleanQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(cleanQuery))
    : messages;

  const displayedMessages = useMemo<MessageWithReactions[]>(() => {
    return [...filteredMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [filteredMessages]);

  return (
    <div className="relative flex flex-1 min-h-0 flex-col bg-[var(--pane-chat-bg)] dark:bg-[#19171b] dark:bg-[radial-gradient(ellipse_at_50%_40%,#262329_0%,#1a181d_70%,#131215_100%)] text-[var(--foreground)] dark:text-white transition-colors duration-150">
      {/* ── In-Conversation Search Bar ──────────────────────────────────────── */}
      {searchOpen && (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-4 py-2.5 flex items-center gap-2.5 nx-fade-in">
          <Search className="h-4 w-4 text-wine dark:text-[#F3B3C2] shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search this conversation…"
            autoFocus
            className="flex-1 bg-transparent text-xs text-charcoal dark:text-foreground placeholder:text-muted focus:outline-none"
          />
          {searchQuery && (
            <span className="text-[11px] font-medium text-muted tabular-nums">
              {displayedMessages.length} found
            </span>
          )}
          <button
            type="button"
            onClick={onCloseSearch}
            className="p-1 rounded-lg text-muted hover:text-charcoal dark:hover:text-foreground hover:bg-[var(--row-hover)] transition-colors"
            title="Close search (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Message History Scrollport with Living Canvas ────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="region"
        aria-label="Message history"
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-6 pb-4 overscroll-contain nx-living-canvas [overflow-anchor:auto] scroll-pt-6"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col pt-2">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-rose/30 bg-rose/10 px-4 py-2.5 text-[13px] text-wine dark:text-[#F3B3C2]"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-auto space-y-3" aria-busy="true" aria-label="Loading messages">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}>
                  <div
                    className="h-10 animate-pulse rounded-2xl bg-stone/50 dark:bg-[#2E222A]"
                    style={{
                      width: `${140 + (i * 37) % 80}px`,
                      opacity: 1 - i * 0.16,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : cleanQuery && displayedMessages.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center py-16 text-center text-muted">
              <Search className="h-6 w-6 text-muted-faint mb-2" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-charcoal dark:text-foreground">No matches found</p>
              <p className="mt-1 text-xs text-muted">No messages matched &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-semibold text-wine dark:text-[#F3B3C2] underline underline-offset-2 hover:opacity-80"
              >
                Clear search
              </button>
            </div>
          ) : messages.length === 0 ? (
            <EmptyConversation
              title={`Chat with ${participantName}`}
              description="Send a message below to start the conversation."
              participantName={participantName}
              participantAvatar={participantAvatar}
              participantUsername={participantUsername}
              showActions={false}
            />
          ) : (
            <div className="mt-auto">
              {displayedMessages.map((message, idx) => {
                const prev = displayedMessages[idx - 1];
                const next = displayedMessages[idx + 1];
                const msgDateStr = getCalendarDateString(message.created_at);
                const prevDateStr = prev ? getCalendarDateString(prev.created_at) : '';
                const nextDateStr = next ? getCalendarDateString(next.created_at) : '';
                const showDateSep = idx === 0 || (msgDateStr !== '' && msgDateStr !== prevDateStr);
                const nextIsSameDay = nextDateStr !== '' && nextDateStr === msgDateStr;
                const joinsPrev = !!prev && !showDateSep && closeInTime(prev, message);
                const joinsNext = !!next && nextIsSameDay && closeInTime(message, next);

                const isNew = !animatedIdsRef.current.has(message.id);
                if (isNew) {
                  animatedIdsRef.current.add(message.id);
                }

                const isOwn = Boolean(
                  currentUserId &&
                  message.sender_id &&
                  String(message.sender_id).trim().toLowerCase() === String(currentUserId).trim().toLowerCase()
                );

                return (
                  <div key={message.id}>
                    {showDateSep && (
                      <div
                        className="my-5 flex justify-center w-full select-none"
                        role="separator"
                        aria-label={dayLabel(message.created_at)}
                      >
                        <div className="flex items-center px-3 py-0.5 rounded-full text-[11px] font-medium tracking-wider uppercase bg-black/[0.04] dark:bg-white/5 text-[#6c6770] dark:text-white/40 select-none border border-black/[0.03] dark:border-white/[0.04]">
                          <span>{dayLabel(message.created_at)}</span>
                        </div>
                      </div>
                    )}
                    <div className={joinsPrev ? 'chat-msg-gap-join' : 'chat-msg-gap-new first:mt-0'}>
                      <MessageItem
                        message={message}
                        isOwn={isOwn}
                        isGroup={conversationType === 'group'}
                        joinsPrev={joinsPrev}
                        joinsNext={joinsNext}
                        isNew={isNew}
                        isHighlighted={highlightedMessageId === message.id}
                        currentUserId={currentUserId}
                        participantName={participantName}
                        onReply={handleReply}
                        onEdit={handleStartEdit}
                        onDelete={handlePromptDelete}
                        onToggleReaction={handleToggleReaction}
                        onJumpToMessage={handleJumpToMessage}
                        allMessages={messages}
                        isEchoed={echoesMap.has(message.id)}
                        onEcho={(msg) => setEchoModalMessage(msg)}
                        onRetry={handleRetryMessage}
                        onDismissFailed={handleDismissFailedMessage}
                        activeActionMessageId={activeActionMessageId}
                        onToggleActions={setActiveActionMessageId}
                      />
                    </div>
                  </div>
                );
              })}

              {/* ── Active Typing Indicator Bubble ────────────────────────────── */}
              {isOtherParticipantTyping && (
                <div className="flex items-center gap-2 py-2 px-3.5 rounded-2xl bg-porcelain dark:bg-[#251D22] border border-stone/80 dark:border-[#3B2C34] w-fit shadow-xs nx-banner-enter mt-2 select-none">
                  <span className="text-[11.5px] font-medium text-muted dark:text-muted-foreground">
                    {participantName} is typing
                  </span>
                  <div className="flex items-center gap-1" aria-hidden="true">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot"
                      style={{ animationDelay: '180ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot"
                      style={{ animationDelay: '360ms' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating New Messages Affordance ───────────────────────────────── */}
      {hasNewMessagesBelow && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 nx-banner-enter">
          <button
            type="button"
            onClick={() => {
              const el = scrollRef.current;
              if (el) {
                el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                setHasNewMessagesBelow(false);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-wine text-white shadow-lg text-[12px] font-semibold hover:bg-wine-hover active:scale-95 transition-all shadow-wine/25"
            aria-label="Scroll to new messages"
          >
            <span>New messages</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Modern Composer with Quoted Reply & Edit Support ─────────────────── */}
      <MessageInput
        conversationId={conversationId}
        currentUserId={currentUserId}
        onSend={handleSend}
        onSaveEdit={handleSaveEdit}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        disabled={loading}
      />

      {/* ── Accessible Delete Confirmation Dialog ────────────────────────────── */}
      <DeleteMessageModal
        isOpen={Boolean(deletingMessage)}
        message={deletingMessage}
        isDeleting={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* ── Accessible Echo Note Modal (Nexus Echoes) ────────────────────────── */}
      <EchoNoteModal
        isOpen={Boolean(echoModalMessage)}
        message={
          echoModalMessage
            ? {
                id: echoModalMessage.id,
                content: echoModalMessage.content,
                senderName: echoModalMessage.sender_id === currentUserId ? 'You' : participantName,
                createdAt: echoModalMessage.created_at,
              }
            : null
        }
        existingNote={echoModalMessage ? echoesMap.get(echoModalMessage.id)?.note : ''}
        isEchoed={Boolean(echoModalMessage && echoesMap.has(echoModalMessage.id))}
        isSaving={isSavingEcho}
        onSave={handleSaveEcho}
        onUnsave={handleUnsaveEcho}
        onClose={() => setEchoModalMessage(null)}
      />
    </div>
  );
}

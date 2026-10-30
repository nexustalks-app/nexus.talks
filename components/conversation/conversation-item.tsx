'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { UserAvatar } from '@/components/user/user-avatar';
import { PresenceIndicator } from '@/components/user/presence-indicator';
import { useSettings } from '@/lib/settings/settings-context';
import { useConversationNavigation } from './conversation-navigation-context';

export interface ConversationItemData {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  status: 'online' | 'away' | 'offline';
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_is_own: boolean;
  unread_count: number;
  is_pinned?: boolean;
  pinned_at?: string | null;
}

interface ConversationItemProps {
  conversation: ConversationItemData;
  isActive: boolean;
  isTyping?: boolean;
  onTogglePin?: (id: string, currentPinned: boolean) => void;
  onOpenContextMenu?: (id: string, x: number, y: number) => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const dateMidnight = new Date(iso);
  dateMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (todayMidnight.getTime() - dateMidnight.getTime()) / 86_400_000
  );
  if (diffDays === 0) return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en', { weekday: 'short' });
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function ConversationItem({
  conversation,
  isActive,
  isTyping = false,
  onTogglePin,
  onOpenContextMenu,
}: ConversationItemProps) {
  const {
    id,
    name,
    username,
    avatar_url,
    status,
    last_message_content,
    last_message_at,
    last_message_is_own,
    unread_count,
    is_pinned = false,
  } = conversation;

  const { settings } = useSettings();
  const router = useRouter();
  const { navigatingId, openConversation } = useConversationNavigation();

  const isNavigating = navigatingId === id;
  const isSelected = isActive || isNavigating;

  const isCompact = settings.appearance.chatDensity === 'compact';
  const showPreviews = settings.chat.showMessagePreviews;
  const unreadIndicator = settings.chat.unreadIndicator;

  const hasUnread = unread_count > 0;
  const timeLabel = formatTime(last_message_at);

  const rawPreview = last_message_content
    ? !showPreviews
      ? 'Message preview hidden'
      : last_message_content
    : null;
  // Clean repeated @handle prefix for presentation without touching database content
  const preview = rawPreview ? rawPreview.replace(/^@[\w.-]+(?:\s*:\s*|\s*·\s*|\s+)/, '') : null;

  // ── Swipe-to-pin & Long-press Gestures ────────────────────────────────────
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeOffsetRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef(false);
  const isScrollingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const triggerPinToggle = useCallback(() => {
    if (onTogglePin) {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(35);
        } catch {
          // ignore vibration restriction
        }
      }
      onTogglePin(id, is_pinned);
    }
  }, [id, is_pinned, onTogglePin]);

  const handleTouchStart = (e: React.TouchEvent) => {
    router.prefetch(`/conversations/${id}`);
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isSwipingRef.current = false;
    isScrollingRef.current = false;

    // Start long-press detection (480ms)
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (!isScrollingRef.current) {
        suppressClickRef.current = true;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(40);
          } catch {
            // ignore
          }
        }
        if (onOpenContextMenu && touchStartRef.current) {
          onOpenContextMenu(id, touchStartRef.current.x, touchStartRef.current.y);
        } else if (onTogglePin) {
          triggerPinToggle();
        }
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 300);
      }
    }, 480);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isScrollingRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Slop angle check: if movement is more vertical than horizontal, let browser scroll naturally
    if (!isSwipingRef.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        isScrollingRef.current = true;
        clearLongPress();
        swipeOffsetRef.current = 0;
        setSwipeOffset(0);
        return;
      }
      if (dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        isSwipingRef.current = true;
        clearLongPress();
      }
    }

    if (isSwipingRef.current && dx > 0) {
      // Swipe to right: apply smooth dampening resistance up to 92px
      const clamped = Math.min(dx * 0.75, 92);
      swipeOffsetRef.current = clamped;
      setSwipeOffset(clamped);
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    if (isSwipingRef.current) {
      suppressClickRef.current = true;
      if (swipeOffsetRef.current >= 45) {
        triggerPinToggle();
      }
      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
      isSwipingRef.current = false;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
    } else {
      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
    }
    touchStartRef.current = null;
  };

  const handleTouchCancel = () => {
    clearLongPress();
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    isSwipingRef.current = false;
    isScrollingRef.current = false;
    touchStartRef.current = null;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If a swipe or long-press just occurred, suppress click navigation
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Allow opening in new tab/window with modifier keys
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    openConversation(id);
  };

  const handlePointerEnter = () => {
    router.prefetch(`/conversations/${id}`);
  };

  // Keyboard shortcut on row: 'P' key toggles pin when row is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      triggerPinToggle();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onOpenContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onOpenContextMenu(id, e.clientX, e.clientY);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onContextMenu={handleContextMenu}
    >
      {/* ── Underneath Swipe Action Reveal (Visible when swiping right) ── */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 flex items-center px-4 rounded-xl transition-opacity duration-150',
          'bg-wine/15 dark:bg-wine/30 border-l-[3px] border-l-wine text-wine dark:text-[#F3B3C2]',
          swipeOffset > 8 ? 'opacity-100' : 'opacity-0'
        )}
        style={{ width: `${Math.max(swipeOffset + 8, 70)}px` }}
      >
        <div className="flex items-center gap-1.5 font-semibold text-xs">
          {is_pinned ? (
            <>
              <PinOff className="h-4 w-4" />
              <span>Unpin</span>
            </>
          ) : (
            <>
              <Pin className="h-4 w-4 fill-wine/20 dark:fill-[#F3B3C2]/20" />
              <span>Pin</span>
            </>
          )}
        </div>
      </div>

      {/* ── Main Conversation Row Link ── */}
      <Link
        href={`/conversations/${id}`}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onKeyDown={handleKeyDown}
        aria-current={isSelected ? 'page' : undefined}
        aria-busy={isNavigating ? 'true' : undefined}
        aria-label={`${name}, ${is_pinned ? 'pinned conversation, ' : ''}${isTyping ? 'typing now, ' : preview ? `${last_message_is_own ? 'you: ' : ''}${preview}` : 'no messages yet'}`}
        className={cn(
          'group relative flex items-center rounded-2xl transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99] select-none',
          isCompact ? 'px-3 py-2 gap-3' : 'px-3.5 py-2.5 gap-3.5',
          isSelected
            ? 'nx-contact-row-active !scale-[1.01]'
            : is_pinned
            ? 'bg-wine/[0.04] dark:bg-wine/15 hover:bg-wine/[0.08] dark:hover:bg-wine/25 border-l-2 border-l-wine dark:border-l-[#F3B3C2]'
            : 'hover:bg-white/60 dark:hover:bg-white/5 hover:shadow-2xs',
        )}
        style={{
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: swipeOffset > 0 ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Active row marker */}
        {isSelected && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-y-2.5 left-1 w-1 rounded-full bg-gradient-to-b from-[#8E2E4A] to-[#631D35] dark:from-[#F3B3C2] dark:to-wine shadow-xs shadow-wine/40 transition-all duration-200',
              isNavigating && 'animate-pulse'
            )}
          />
        )}

        {/* Avatar + presence indicator overlapping lower-right edge */}
        <div className="relative shrink-0">
          <UserAvatar
            id={username || id}
            display_name={name}
            avatar_url={avatar_url}
            size={isCompact ? 'sm' : 'md'}
            isPinned={is_pinned}
          />
          <PresenceIndicator
            status={status}
            className="absolute bottom-0.5 right-0.5 !h-3 !w-3 ring-2 ring-[var(--surface)] z-10"
          />
        </div>

        {/* Contact info and message preview (middle column) */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={cn(
                'truncate text-[14px] sm:text-[14.5px] leading-snug',
                hasUnread
                  ? 'font-bold text-charcoal dark:text-foreground'
                  : 'font-semibold text-charcoal/90 dark:text-foreground/90 group-hover:text-charcoal dark:group-hover:text-foreground',
              )}
            >
              {name}
            </span>
          </div>

          <div className="mt-0.5 truncate">
            {/* Real-time typing indicator takes priority over message snippet */}
            {isTyping ? (
              <div
                className="flex items-center gap-1.5 text-wine dark:text-[#E2A6B3] font-medium text-[12px] sm:text-[12.5px] leading-snug nx-fade-in"
                aria-live="polite"
              >
                <span className="italic font-medium">typing</span>
                <span className="inline-flex items-center gap-0.5" aria-hidden="true">
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
                </span>
              </div>
            ) : preview ? (
              <p
                className={cn(
                  'truncate leading-snug',
                  isCompact ? 'text-[12px]' : 'text-[12.5px] sm:text-[13px]',
                  hasUnread
                    ? 'text-[#1A1A1A] dark:text-[#EDEDED] font-medium sm:font-semibold'
                    : 'text-[#71717A] dark:text-[#A1A1AA] font-normal',
                  !showPreviews && 'italic text-muted-faint dark:text-[#887882]',
                )}
              >
                {/* Outgoing preview prefix */}
                {last_message_is_own && showPreviews && (
                  <span className="font-medium text-muted-faint dark:text-[#887882] mr-1 select-none">
                    You:
                  </span>
                )}
                {preview}
              </p>
            ) : (
              <p className="truncate text-[12px] text-muted-faint dark:text-[#887882] italic">
                @{username}
              </p>
            )}
          </div>
        </div>

        {/* Right-side metadata column: pinned icon + timestamp top-right, pin button + unread badge bottom-right */}
        <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5 pl-2 min-w-[56px]">
          {/* Line 1: Pin icon + Timestamp */}
          <div className="h-5 flex items-center justify-end gap-1.5">
            {is_pinned && (
              <Pin
                className="h-3 w-3 text-wine dark:text-[#F3B3C2] shrink-0 fill-wine/25 dark:fill-[#F3B3C2]/25"
                aria-label="Pinned conversation"
              />
            )}
            {isNavigating ? (
              <span
                className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-wine dark:text-[#F3B3C2] nx-fade-in"
                title="Opening conversation…"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Opening…</span>
              </span>
            ) : timeLabel ? (
              <span
                className={cn(
                  'shrink-0 text-[11px] sm:text-[11.5px] tabular-nums font-mono text-right',
                  hasUnread ? 'font-semibold text-wine dark:text-[#F3B3C2]' : 'text-[#71717A] dark:text-[#A1A1AA]',
                )}
              >
                {timeLabel}
              </span>
            ) : null}
          </div>

          {/* Line 2: Unread Badge (Hover pin button removed in favor of right-click / press-and-hold context menu) */}
          <div className="h-5 flex items-center justify-end gap-1.5">
            {hasUnread && (
              unreadIndicator === 'dot' ? (
                <span
                  aria-label={`${unread_count} unread`}
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-wine ring-2 ring-[var(--surface)]"
                  title={`${unread_count} unread`}
                />
              ) : (
                <span
                  aria-label={`${unread_count} unread`}
                  className="flex h-4.5 min-w-[19px] shrink-0 items-center justify-center rounded-full bg-wine px-1.5 text-[10px] font-bold text-white shadow-xs tabular-nums"
                >
                  {unread_count > 99 ? '99+' : unread_count}
                </span>
              )
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

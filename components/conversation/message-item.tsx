'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Message, MessageReaction } from '@/types/database';
import { useSettings } from '@/lib/settings/settings-context';
import { Reply, Plus, Pencil, Trash2, Bookmark, Check, Play, Pause, Copy, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import {
  POPULAR_REACTION_EMOJIS,
  groupMessageReactions,
  type GroupedReaction,
} from '@/lib/utils/reactions';

const DEFAULT_WAVEFORM = [0.35, 0.6, 0.9, 1.0, 0.7, 0.85, 0.45, 0.8, 0.65, 0.35, 0.9, 0.55, 0.75, 1.0, 0.8, 0.45, 0.65, 0.35, 0.5, 0.25];

export interface MessageWithReactions extends Message {
  reply_to?: {
    id: string;
    content: string;
    sender_id: string;
    sender_name?: string;
    deleted_at?: string | null;
  } | null;
  message_reactions?: MessageReaction[];
  status?: 'sending' | 'sent' | 'failed';
  failedError?: string;
}

function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

interface MessageItemProps {
  message: MessageWithReactions;
  isOwn: boolean;
  isGroup?: boolean;
  joinsPrev?: boolean;
  joinsNext?: boolean;
  isNew?: boolean;
  isHighlighted?: boolean;
  currentUserId: string;
  participantName?: string;
  onReply?: (message: MessageWithReactions) => void;
  onEdit?: (message: MessageWithReactions) => void;
  onDelete?: (message: MessageWithReactions) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onRetry?: (message: MessageWithReactions) => void;
  onDismissFailed?: (messageId: string) => void;
  allMessages?: MessageWithReactions[];
  isEchoed?: boolean;
  onEcho?: (message: MessageWithReactions) => void;
  activeActionMessageId?: string | null;
  onToggleActions?: (messageId: string | null) => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  isOwn,
  isGroup = false,
  joinsPrev = false,
  joinsNext = false,
  isNew = false,
  isHighlighted = false,
  currentUserId,
  participantName = 'Participant',
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onJumpToMessage,
  onRetry,
  onDismissFailed,
  allMessages,
  isEchoed = false,
  onEcho,
  activeActionMessageId,
  onToggleActions,
}: MessageItemProps) {
  // If controlled by parent, use activeActionMessageId; else fallback to local state
  const [localActionsOpen, setLocalActionsOpen] = useState(false);
  const isActionsOpen = activeActionMessageId !== undefined
    ? activeActionMessageId === message.id
    : localActionsOpen;

  const setActionsOpen = useCallback((open: boolean) => {
    if (onToggleActions) {
      onToggleActions(open ? message.id : null);
    } else {
      setLocalActionsOpen(open);
    }
  }, [message.id, onToggleActions]);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const isAudio =
    (message.type as string) === 'audio' ||
    message.content.startsWith('[audio') ||
    message.content.includes('__AUDIO__');

  const isImage =
    message.type === 'image' ||
    message.content.startsWith('/demo/') ||
    (message.content.startsWith('http') && (message.content.includes('.jpg') || message.content.includes('.png') || message.content.includes('.webp')));

  const togglePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayingAudio((prev) => !prev);
  };

  useEffect(() => {
    if (!isPlayingAudio) return;
    const interval = setInterval(() => {
      setAudioProgress((prev) => {
        if (prev >= 1) {
          setIsPlayingAudio(false);
          return 0;
        }
        return prev + 0.05;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const [placeBelow, setPlaceBelow] = useState(false);

  // When actions open, calculate whether the bubble is too close to top of viewport
  useEffect(() => {
    if (isActionsOpen && bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      // If within 130px from top, flip contextual popover below bubble
      setPlaceBelow(rect.top < 130);
    }
  }, [isActionsOpen]);

  // Touch Long-Press detection refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  const { settings } = useSettings();
  const isSoft = settings.appearance.bubbleStyle === 'soft';

  // Group reactions for display
  const groupedReactions: GroupedReaction[] = groupMessageReactions(
    message.message_reactions,
    currentUserId
  );

  const isDeleted = Boolean(
    message.deleted_at || message.content === 'This message was deleted'
  );

  const [copied, setCopied] = useState(false);
  const isSending = message.status === 'sending' || (message.id.startsWith('temp_') && message.status !== 'failed');
  const isFailed = message.status === 'failed';

  const handleCopyText = useCallback(async () => {
    if (isDeleted || !message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = message.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
    }
  }, [message.content, isDeleted]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleCopyText();
      } else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onReply?.(message);
      } else if ((e.key === 'e' || e.key === 'E') && isOwn && !isDeleted && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onEdit?.(message);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && isOwn && !isDeleted) {
        e.preventDefault();
        onDelete?.(message);
      } else if (e.key === 'Escape') {
        setActionsOpen(false);
      }
    },
    [handleCopyText, isOwn, isDeleted, message, onReply, onEdit, onDelete, setActionsOpen]
  );

  // ── Touch and Long-Press Handlers ──────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleted) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isLongPressActiveRef.current = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(35);
        } catch {
          // ignore
        }
      }
      setActionsOpen(true);
    }, 440);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    // If finger moves more than 9px, user is scrolling the message list - cancel timer immediately
    if (dx > 9 || dy > 9) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // If long-press just fired, prevent default so subsequent click doesn't dismiss it
    if (isLongPressActiveRef.current) {
      e.preventDefault();
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressActiveRef.current = false;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDeleted) {
      setActionsOpen(!isActionsOpen);
    }
  };

  // Resolve quoted reply message if this is a reply
  let quotedMessage: { id: string; senderName: string; content: string; isDeleted?: boolean } | null = null;
  if (message.reply_to_id) {
    if (message.reply_to) {
      const isOriginalOwn = message.reply_to.sender_id === currentUserId;
      const isReplyDeleted = Boolean(
        message.reply_to.deleted_at ||
        message.reply_to.content === 'This message was deleted'
      );
      quotedMessage = {
        id: message.reply_to.id,
        senderName: isReplyDeleted ? 'Message unavailable' : isOriginalOwn ? 'You' : participantName,
        content: isReplyDeleted ? 'Original message was deleted' : message.reply_to.content,
        isDeleted: isReplyDeleted,
      };
    } else if (allMessages) {
      const original = allMessages.find((m) => m.id === message.reply_to_id);
      if (original) {
        const isOriginalOwn = original.sender_id === currentUserId;
        const isReplyDeleted = Boolean(original.deleted_at || original.content === 'This message was deleted');
        quotedMessage = {
          id: original.id,
          senderName: isReplyDeleted ? 'Message unavailable' : isOriginalOwn ? 'You' : participantName,
          content: isReplyDeleted ? 'Original message was deleted' : original.content,
          isDeleted: isReplyDeleted,
        };
      }
    }

    if (!quotedMessage) {
      quotedMessage = {
        id: message.reply_to_id,
        senderName: 'Original message',
        content: 'Original message was deleted',
        isDeleted: true,
      };
    }
  }

  const ownRadius = `${/* TL */ '18px'} ${/* TR */ joinsPrev ? '6px' : '18px'} ${/* BR */ joinsNext ? '6px' : '18px'} ${/* BL */ '18px'}`;
  const otherRadius = `${/* TL */ joinsPrev ? '6px' : '18px'} ${/* TR */ '18px'} ${/* BR */ '18px'} ${/* BL */ joinsNext ? '6px' : '18px'}`;

  const timeString = message.created_at ? formatMessageTime(message.created_at) : '';

  return (
    <div
      id={`message-${message.id}`}
      tabIndex={0}
      role="article"
      aria-label={`${isOwn ? 'You' : participantName}: ${isDeleted ? 'Deleted message' : message.content}`}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex flex-col outline-none focus-visible:ring-1 focus-visible:ring-wine/40 rounded-2xl transition-all duration-150',
        isActionsOpen ? 'z-40 relative' : 'relative',
        isOwn ? 'items-end' : 'items-start',
        isNew && 'animate-message-enter',
      )}
    >
      {/* ── Mobile Contextual Actions Backdrop ──────────────────────────────── */}
      {isActionsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/15 dark:bg-black/35 backdrop-blur-[2px] transition-opacity duration-150 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setActionsOpen(false);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setActionsOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Sender Name Label above incoming message (group chats only) ──── */}
      {isGroup && !isOwn && !joinsPrev && !isDeleted && (
        <span className="text-[11.5px] font-medium text-[#a5a1a8] mb-1 ml-1 select-none leading-none">
          {participantName}
        </span>
      )}

      {/* ── Main Message Row (Bubble + Desktop Hover Toolbar) ───────────────── */}
      <div
        className={cn(
          'relative flex items-center gap-2 max-w-full',
          isActionsOpen && 'z-50',
          isOwn ? 'flex-row' : 'flex-row',
        )}
      >
        {/* ── Desktop Hover Toolbar (Left for own message) ────────────────────── */}
        {isOwn && !isDeleted && (
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <div
              className={cn(
                'hidden md:flex items-center gap-0.5 rounded-full liquid-glass-popover px-1.5 py-0.5 transition-all duration-150 ease-spring',
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 scale-95',
              )}
            >
              {POPULAR_REACTION_EMOJIS.slice(0, 4).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction?.(message.id, emoji)}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-stone/50 dark:hover:bg-[#382832] hover:scale-115 active:scale-90 transition-transform text-[12px]"
                  title={`React with ${emoji}`}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <div className="mx-0.5 h-3.5 w-[1px] bg-stone/70 dark:bg-[#3B2C34]" />
              <button
                type="button"
                onClick={() => onReply?.(message)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832] active:scale-90 transition-all"
                title="Reply (R)"
                aria-label="Reply to message"
              >
                <Reply className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleCopyText}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full active:scale-90 transition-all',
                  copied
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15'
                    : 'text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832]'
                )}
                title={copied ? 'Copied to clipboard!' : 'Copy message text (C)'}
                aria-label={copied ? 'Copied to clipboard' : 'Copy message text'}
              >
                {copied ? <Check className="h-3 w-3 stroke-[2.4]" /> : <Copy className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => onEdit?.(message)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-charcoal dark:hover:text-stone hover:bg-stone/50 dark:hover:bg-[#382832] active:scale-90 transition-all"
                title="Edit message (E)"
                aria-label="Edit message"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(message)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-90 transition-all"
                title="Delete message (Del)"
                aria-label="Delete message"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onEcho?.(message)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full active:scale-90 transition-all',
                  isEchoed
                    ? 'text-wine dark:text-[#F3B3C2] bg-wine/10 dark:bg-wine/30'
                    : 'text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832]'
                )}
                title={isEchoed ? 'Saved in Echoes' : 'Save to Echoes'}
                aria-label={isEchoed ? 'Saved in Echoes' : 'Save to Echoes'}
              >
                <Bookmark className={cn('h-3 w-3', isEchoed && 'fill-current')} />
              </button>
            </div>
          </div>
        )}

        {/* ── Message Bubble Container ───────────────────────────────────────── */}
        <div
          ref={bubbleRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onContextMenu={handleContextMenu}
          className={cn(
            'relative w-fit max-w-[85%] sm:max-w-[78%] px-4 py-2.5 touch-pan-y select-none sm:select-text cursor-pointer sm:cursor-default',
            'transition-[border-radius,background-color,color,border-color,box-shadow,ring,transform] duration-150 ease-out',
            isActionsOpen && 'scale-[1.01] ring-2 ring-wine dark:ring-[#F3B3C2] shadow-xl',
            isHighlighted &&
              'ring-2 ring-wine ring-offset-2 ring-offset-porcelain dark:ring-offset-[#1C1619] shadow-md',
            isDeleted && 'opacity-70 italic border border-dashed border-stone-subtle dark:border-white/15 bg-transparent text-muted dark:text-[#8e8a92]',
            !isDeleted && isOwn && 'border text-[var(--message-outgoing-text)]',
            !isDeleted && !isOwn && 'border text-[var(--message-incoming-text)]',
          )}
          style={
            isDeleted
              ? {
                  borderRadius: isOwn ? ownRadius : otherRadius,
                  backgroundColor: 'transparent',
                  color: 'var(--foreground-muted)',
                  border: '1px dashed var(--chat-divider)',
                }
              : isOwn
              ? {
                  borderRadius: ownRadius,
                  background: 'var(--chat-outgoing-bg, linear-gradient(135deg, #78263F 0%, #631D35 55%, #4C1425 100%))',
                  borderColor: 'var(--chat-outgoing-border, rgba(255, 255, 255, 0.22))',
                  color: 'var(--chat-outgoing-text, #FFFFFF)',
                  boxShadow: 'var(--chat-outgoing-shadow, 0 4px 18px -2px rgba(99, 29, 53, 0.32), inset 0 1px 0.5px rgba(255, 255, 255, 0.35))',
                }
              : {
                  borderRadius: otherRadius,
                  backgroundColor: 'var(--chat-incoming-bg, var(--message-incoming-bg))',
                  borderColor: 'var(--chat-incoming-border, var(--message-incoming-border))',
                  color: 'var(--chat-incoming-text, var(--message-incoming-text))',
                  boxShadow: 'var(--chat-incoming-shadow, 0 2px 10px -2px rgba(35, 15, 22, 0.06))',
                }
          }
        >
          {/* ── Quoted Reply Preview Header (if message is a reply) ──────────── */}
          {quotedMessage && (
            <button
              type="button"
              disabled={quotedMessage.isDeleted}
              onClick={(e) => {
                e.stopPropagation();
                if (quotedMessage && !quotedMessage.isDeleted) {
                  onJumpToMessage?.(quotedMessage.id);
                }
              }}
              className={cn(
                'mb-1.5 flex items-start gap-2 rounded-lg bg-black/6 dark:bg-white/10 px-2.5 py-1.5 text-left transition-colors w-full select-none group/quote',
                quotedMessage.isDeleted
                  ? 'cursor-default opacity-70'
                  : 'cursor-pointer hover:bg-black/10 dark:hover:bg-white/15'
              )}
              title={quotedMessage.isDeleted ? 'Original message was deleted' : 'Jump to original message'}
              aria-label={
                quotedMessage.isDeleted
                  ? 'Original message was deleted'
                  : `Jump to original message by ${quotedMessage.senderName}: ${quotedMessage.content}`
              }
            >
              <div
                className={cn(
                  'h-full min-h-[20px] w-0.5 rounded-full shrink-0 self-stretch',
                  quotedMessage.isDeleted
                    ? 'bg-stone-subtle dark:bg-stone/40'
                    : 'bg-wine dark:bg-[#F3B3C2]'
                )}
              />
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'text-[11px] font-bold block truncate',
                    quotedMessage.isDeleted
                      ? 'text-muted dark:text-muted-foreground'
                      : 'text-wine dark:text-[#F3B3C2]'
                  )}
                >
                  {quotedMessage.senderName}
                </span>
                <span
                  className={cn(
                    'text-[12px] block truncate line-clamp-1',
                    quotedMessage.isDeleted ? 'italic opacity-60' : 'opacity-85'
                  )}
                >
                  {quotedMessage.content}
                </span>
              </div>
            </button>
          )}

          {/* ── Audio Message, Shared Image, or Regular Text ─────────────────── */}
          {isAudio ? (
            <div className="flex flex-col gap-1 w-full min-w-[210px] sm:min-w-[230px]">
              <div className="flex items-center gap-2.5 py-0.5">
                {/* Circular Play Button */}
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#19171b] shadow-sm hover:scale-105 active:scale-95 transition-transform"
                  aria-label={isPlayingAudio ? 'Pause audio' : 'Play audio'}
                >
                  {isPlayingAudio ? (
                    <Pause className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Waveform Visualization */}
                <div className="flex flex-1 items-center gap-[3px] h-6 px-1">
                  {DEFAULT_WAVEFORM.map((height, i) => {
                    const isPlayed = i / DEFAULT_WAVEFORM.length <= audioProgress;
                    return (
                      <span
                        key={i}
                        className={cn(
                          'w-[2.5px] rounded-full transition-all duration-150',
                          isPlayed ? 'bg-white' : 'bg-white/40',
                          isPlayingAudio && 'animate-pulse'
                        )}
                        style={{
                          height: `${Math.max(4, height * 20)}px`,
                          animationDelay: `${i * 35}ms`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Duration */}
                <span className="text-[11.5px] font-medium text-[#b0acb3] tabular-nums shrink-0">
                  {message.content.includes(':') ? message.content.replace(/[^0-9:]/g, '') || '0:05' : '0:05'}
                </span>
              </div>

              {/* Subdued Timestamp Bottom-Right */}
              <div className="flex justify-end items-center gap-1 text-[10px] text-[var(--foreground-muted)] dark:text-[#8e8a92] pt-0.5 select-none">
                {timeString && <time dateTime={message.created_at}>{timeString}</time>}
                {isOwn && (
                  isFailed ? (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] text-red-300 font-semibold" title={message.failedError || 'Failed to send'}>
                      <AlertCircle className="h-2.5 w-2.5 text-red-300" />
                    </span>
                  ) : isSending ? (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] text-white/70 opacity-80" title="Sending...">
                      <Clock className="h-2.5 w-2.5 animate-pulse" />
                    </span>
                  ) : (
                    <Check className="h-2.5 w-2.5 stroke-[2.2] opacity-80" aria-label="Sent" />
                  )
                )}
              </div>
            </div>
          ) : isImage ? (
            <div className="flex flex-col gap-1.5 w-full">
              <div className="rounded-[18px] overflow-hidden max-w-[220px] sm:max-w-[260px] border border-stone-subtle dark:border-white/10 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.content}
                  alt="Shared media"
                  className="w-full h-auto object-cover rounded-[18px]"
                />
              </div>
              <div className="flex justify-end items-center gap-1 text-[10px] text-[var(--foreground-muted)] dark:text-[#8e8a92] select-none">
                {timeString && <time dateTime={message.created_at}>{timeString}</time>}
                {isOwn && (
                  isFailed ? (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] text-red-300 font-semibold" title={message.failedError || 'Failed to send'}>
                      <AlertCircle className="h-2.5 w-2.5 text-red-300" />
                    </span>
                  ) : isSending ? (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] text-white/70 opacity-80" title="Sending...">
                      <Clock className="h-2.5 w-2.5 animate-pulse" />
                    </span>
                  ) : (
                    <Check className="h-2.5 w-2.5 stroke-[2.2] opacity-80" aria-label="Sent" />
                  )
                )}
              </div>
            </div>
          ) : (
            /* Regular Message Content */
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <p className="chat-bubble-text whitespace-pre-wrap break-words text-[14px] leading-relaxed flex-1 min-w-0">
                {message.content}
              </p>
              <div
                className={cn(
                  'ml-auto flex items-center gap-1 shrink-0 text-[10px] tabular-nums select-none leading-none mb-0.5',
                  isOwn ? 'text-white/70' : 'text-[var(--foreground-muted)] dark:text-[#8e8a92]'
                )}
              >
                {message.edited_at && (
                  <span
                    className="italic mr-0.5 text-[9.5px] opacity-80"
                    title="Edited message"
                  >
                    (edited)
                  </span>
                )}
                {timeString && <time dateTime={message.created_at}>{timeString}</time>}
                {isOwn && (
                  isFailed ? (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] text-red-300 font-semibold" title={message.failedError || 'Failed to send'}>
                      <AlertCircle className="h-2.5 w-2.5 text-red-300" />
                    </span>
                  ) : isSending ? (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] text-white/70 opacity-80" title="Sending...">
                      <Clock className="h-2.5 w-2.5 animate-pulse" />
                    </span>
                  ) : (
                    <Check className="h-2.5 w-2.5 stroke-[2.2] opacity-80" aria-label="Sent" />
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Desktop Hover Toolbar (Right for other's message) ──────────────── */}
        {!isOwn && !isDeleted && (
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <div
              className={cn(
                'hidden md:flex items-center gap-0.5 rounded-full liquid-glass-popover px-1.5 py-0.5 transition-all duration-150 ease-spring',
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 scale-95',
              )}
            >
              {POPULAR_REACTION_EMOJIS.slice(0, 4).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction?.(message.id, emoji)}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-stone/50 dark:hover:bg-[#382832] hover:scale-115 active:scale-90 transition-transform text-[12px]"
                  title={`React with ${emoji}`}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <div className="mx-0.5 h-3.5 w-[1px] bg-stone/70 dark:bg-[#3B2C34]" />
              <button
                type="button"
                onClick={() => onReply?.(message)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832] active:scale-90 transition-all"
                title="Reply"
                aria-label="Reply to message"
              >
                <Reply className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleCopyText}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full active:scale-90 transition-all',
                  copied
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15'
                    : 'text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832]'
                )}
                title={copied ? 'Copied to clipboard!' : 'Copy message text (C)'}
                aria-label={copied ? 'Copied to clipboard' : 'Copy message text'}
              >
                {copied ? <Check className="h-3 w-3 stroke-[2.4]" /> : <Copy className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => onEcho?.(message)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full active:scale-90 transition-all',
                  isEchoed
                    ? 'text-wine dark:text-[#F3B3C2] bg-wine/10 dark:bg-wine/30'
                    : 'text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832]'
                )}
                title={isEchoed ? 'Saved in Echoes' : 'Save to Echoes'}
                aria-label={isEchoed ? 'Saved in Echoes' : 'Save to Echoes'}
              >
                <Bookmark className={cn('h-3 w-3', isEchoed && 'fill-current')} />
              </button>
            </div>
          </div>
        )}

        {/* ── Mobile Contextual Popover Actions (Long-Press / Context Menu) ───── */}
        {isActionsOpen && !isDeleted && (
          <div
            data-mobile-popover="true"
            className={cn(
              'absolute z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150',
              'max-w-[calc(100vw-32px)] select-none',
              isOwn ? 'right-0 items-end' : 'left-0 items-start',
              placeBelow ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Curated Reaction Emojis Bar */}
            <div className="flex items-center gap-1 rounded-full px-2 py-1.5 shadow-xl border border-[var(--border)] bg-[var(--surface)]/98 backdrop-blur-md">
              {POPULAR_REACTION_EMOJIS.map((emoji) => {
                const hasReacted = groupedReactions.some((r) => r.emoji === emoji && r.hasReacted);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onToggleReaction?.(message.id, emoji);
                      setActionsOpen(false);
                    }}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-base hover:scale-120 active:scale-90 transition-transform duration-120',
                      hasReacted && 'bg-wine/15 dark:bg-wine/30 ring-1.5 ring-wine dark:ring-[#F3B3C2]'
                    )}
                    title={`React with ${emoji}`}
                    aria-label={`React with ${emoji}`}
                  >
                    <span>{emoji}</span>
                  </button>
                );
              })}
            </div>

            {/* 2. Action Buttons Pill */}
            <div className="flex items-center gap-1 rounded-2xl p-1 shadow-xl border border-[var(--border)] bg-[var(--surface)]/98 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  onReply?.(message);
                  setActionsOpen(false);
                }}
                className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-[var(--row-hover)] active:scale-95 transition-all"
                title="Reply to message"
                aria-label="Reply to message"
              >
                <Reply className="h-3.5 w-3.5 text-wine dark:text-[#F3B3C2]" />
                <span>Reply</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCopyText();
                  setActionsOpen(false);
                }}
                className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-[var(--row-hover)] active:scale-95 transition-all"
                title="Copy message text"
                aria-label="Copy message text"
              >
                <Copy className="h-3.5 w-3.5 text-wine dark:text-[#F3B3C2]" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onEcho?.(message);
                  setActionsOpen(false);
                }}
                className={cn(
                  'flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95',
                  isEchoed
                    ? 'text-wine dark:text-[#F3B3C2] bg-wine/10 dark:bg-wine/25 font-bold'
                    : 'text-charcoal dark:text-foreground hover:bg-[var(--row-hover)]'
                )}
                title={isEchoed ? 'Saved in Echoes' : 'Save to Echoes'}
                aria-label={isEchoed ? 'Saved in Echoes' : 'Save to Echoes'}
              >
                <Bookmark className={cn('h-3.5 w-3.5', isEchoed ? 'fill-current text-wine dark:text-[#F3B3C2]' : 'text-wine dark:text-[#F3B3C2]')} />
                <span>{isEchoed ? 'Saved' : 'Save'}</span>
              </button>

              {isOwn && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onEdit?.(message);
                      setActionsOpen(false);
                    }}
                    className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-[var(--row-hover)] active:scale-95 transition-all"
                    title="Edit message"
                    aria-label="Edit message"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onDelete?.(message);
                      setActionsOpen(false);
                    }}
                    className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all"
                    title="Delete message"
                    aria-label="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Failed Message Retry Banner ────────────────────────────────────── */}
      {isFailed && isOwn && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-1 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 select-none animate-in fade-in duration-150 pr-1 justify-end"
        >
          <span className="text-[11px] font-medium flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Failed to send
          </span>
          <button
            type="button"
            onClick={() => onRetry?.(message)}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/70 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 font-semibold text-[11px] transition-colors active:scale-95"
            title="Retry sending message"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            <span>Retry</span>
          </button>
          {onDismissFailed && (
            <button
              type="button"
              onClick={() => onDismissFailed(message.id)}
              className="text-[11px] text-muted hover:text-charcoal dark:hover:text-foreground underline underline-offset-2 ml-0.5"
              title="Discard failed message"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* ── Reaction Chips (Rendered beneath message when reactions exist) ─── */}
      {groupedReactions.length > 0 && !isDeleted && (
        <div
          className={cn(
            'mt-1.5 flex flex-wrap items-center gap-1.5 select-none',
            isOwn ? 'justify-end pr-1' : 'justify-start pl-1',
          )}
        >
          {groupedReactions.map((chip) => (
            <button
              key={chip.emoji}
              type="button"
              onClick={() => onToggleReaction?.(message.id, chip.emoji)}
              aria-label={`${chip.hasReacted ? 'Remove' : 'Add'} reaction ${chip.emoji}, ${chip.count} reactions`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium border transition-transform duration-120 ease-spring hover:scale-105 active:scale-90',
                chip.hasReacted
                  ? 'border-wine/40 bg-wine/15 text-wine dark:text-[#F3B3C2] dark:border-wine/50 dark:bg-wine/30 font-semibold shadow-2xs ring-1 ring-wine/25'
                  : 'border-stone/90 dark:border-[#3B2C34] bg-white/95 dark:bg-[#251D22] text-charcoal dark:text-foreground hover:bg-porcelain dark:hover:bg-[#2F242B] shadow-2xs',
              )}
            >
              <span className="text-[12.5px] leading-none">{chip.emoji}</span>
              <span className="tabular-nums text-[10.5px] font-semibold">{chip.count}</span>
            </button>
          ))}

          {/* Quick add reaction button on existing chips */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActionsOpen(true);
            }}
            title="Add reaction"
            aria-label="Add reaction"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-stone/90 dark:border-[#3B2C34] text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:border-wine/40 active:scale-90 transition-all"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
});

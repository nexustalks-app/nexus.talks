'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Reply, Pencil, X, Check, Paperclip, Calendar, Mic } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSettings } from '@/lib/settings/settings-context';
import { createClient } from '@/lib/supabase/client';
import { broadcastTyping } from '@/lib/realtime/typing-channel';

export interface ReplyingTo {
  id: string;
  senderName: string;
  content: string;
}

export interface EditingMessage {
  id: string;
  content: string;
}

interface MessageInputProps {
  conversationId?: string;
  currentUserId?: string;
  onSend: (content: string, replyToId?: string | null) => Promise<void>;
  onSaveEdit?: (messageId: string, newContent: string) => Promise<void>;
  disabled?: boolean;
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
  editingMessage?: EditingMessage | null;
  onCancelEdit?: () => void;
}

export function MessageInput({
  conversationId,
  currentUserId,
  onSend,
  onSaveEdit,
  disabled,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draftBackupRef = useRef<string>('');
  const textRef = useRef<string>(text);
  textRef.current = text;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { settings } = useSettings();

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmittedRef = useRef<number>(0);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (conversationId && currentUserId) {
      const supabase = createClient();
      broadcastTyping(supabase, conversationId, currentUserId, false);
      lastTypingEmittedRef.current = 0;
    }
  }, [conversationId, currentUserId]);

  // Clean up typing state on unmount or when conversation changes
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (conversationId && currentUserId) {
      const trimmed = val.trim();
      const supabase = createClient();
      if (trimmed.length > 0) {
        const now = Date.now();
        if (now - lastTypingEmittedRef.current > 1500) {
          lastTypingEmittedRef.current = now;
          broadcastTyping(supabase, conversationId, currentUserId, true);
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          broadcastTyping(supabase, conversationId, currentUserId, false);
          lastTypingEmittedRef.current = 0;
        }, 2500);
      } else {
        stopTyping();
      }
    }
  };

  // Switch between normal draft and editing mode with draft preservation
  useEffect(() => {
    if (editingMessage) {
      // Backup any current typing draft
      draftBackupRef.current = textRef.current;
      setText(editingMessage.content);
      // Auto-focus and place cursor at end
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            editingMessage.content.length,
            editingMessage.content.length
          );
        }
      }, 0);
    }
  }, [editingMessage]);

  // Focus textarea when user clicks Reply on a message
  useEffect(() => {
    if (replyingTo && !editingMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingTo, editingMessage]);

  // Dynamic textarea auto-resizing
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const handleCancelEdit = useCallback(() => {
    // Restore backed up draft
    setText(draftBackupRef.current);
    draftBackupRef.current = '';
    onCancelEdit?.();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [onCancelEdit]);

  const canSubmit = editingMessage
    ? text.trim().length > 0 && !isSubmitting && !disabled && text.trim() !== editingMessage.content
    : text.trim().length > 0 && !isSubmitting && !disabled;

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting || disabled) return;

    // Immediately stop typing indicator on message submission
    stopTyping();

    if (editingMessage) {
      if (trimmed === editingMessage.content) {
        // No change made, simply cancel edit mode
        handleCancelEdit();
        return;
      }
      setIsSubmitting(true);
      try {
        await onSaveEdit?.(editingMessage.id, trimmed);
        // Restore previous typing draft upon successful save
        setText(draftBackupRef.current);
        draftBackupRef.current = '';
      } finally {
        setIsSubmitting(false);
        textareaRef.current?.focus();
      }
    } else {
      // Clear composer draft immediately for instant feedback
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }

      // Dispatch send (optimistic update runs synchronously in 0ms)
      try {
        await onSend(trimmed, replyingTo?.id || null);
      } finally {
        // Strictly retain focus so user can type multiple consecutive messages
        textareaRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Esc key cancels editing or replying if active
    if (e.key === 'Escape') {
      if (editingMessage) {
        e.preventDefault();
        handleCancelEdit();
        return;
      }
      if (replyingTo && onCancelReply) {
        e.preventDefault();
        onCancelReply();
        return;
      }
    }

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    if (settings.chat.sendOnEnter === 'ctrlEnter') {
      if (isCtrlOrMeta && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <div
      className="shrink-0 px-4 sm:px-6 py-3 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] border-t backdrop-blur-2xl bg-white/80 dark:bg-[#181116]/85 border-black/[0.06] dark:border-white/[0.08] shadow-xs transition-colors"
    >
      <div className="mx-auto w-full max-w-3xl">
        {/* ── Editing Message Banner ────────────────────────────────────────── */}
        {editingMessage && (
          <div className="mb-2.5 flex items-center justify-between gap-3 rounded-xl border border-wine/25 bg-wine/10 dark:border-white/10 dark:bg-[#28252c] px-3.5 py-2 shadow-xs nx-banner-enter">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-1 rounded-full bg-wine dark:bg-white/70 shrink-0" />
              <Pencil className="h-3.5 w-3.5 text-wine dark:text-white/80 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-wine dark:text-white/90 truncate">
                  Editing message <span className="font-normal text-muted dark:text-[#8e8a92] ml-1">(Esc to cancel)</span>
                </p>
                <p className="text-[12px] text-charcoal dark:text-white/75 truncate">
                  {editingMessage.content}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-muted dark:text-[#8e8a92] hover:text-charcoal dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Cancel editing (Esc)"
              aria-label="Cancel editing"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Quoted Reply Banner above composer ────────────────────────────── */}
        {!editingMessage && replyingTo && (
          <div className="mb-2.5 flex items-center justify-between gap-3 rounded-xl border border-wine/25 bg-wine/10 dark:border-white/10 dark:bg-[#28252c] px-3.5 py-2 shadow-xs nx-banner-enter">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-1 rounded-full bg-wine dark:bg-white/70 shrink-0" />
              <Reply className="h-3.5 w-3.5 text-wine dark:text-white/80 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-wine dark:text-white/90 truncate">
                  Replying to {replyingTo.senderName} <span className="font-normal text-muted dark:text-[#8e8a92] ml-1">(Esc to cancel)</span>
                </p>
                <p className="text-[12px] text-charcoal dark:text-white/75 truncate">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-muted dark:text-[#8e8a92] hover:text-charcoal dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Cancel reply (Esc)"
              aria-label="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Reference Bottom Composer Row ─────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Main Input Pill */}
          <div
            className={cn(
              'flex flex-1 min-w-0 items-center gap-2.5 rounded-[24px] px-4 py-2 transition-all duration-150 ease-out',
              'bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.07] dark:border-white/[0.09] focus-within:border-wine/40 dark:focus-within:border-[#F3B3C2]/40 focus-within:bg-white dark:focus-within:bg-[#251A22] shadow-inner',
            )}
          >
            <button
              type="button"
              aria-label="Add attachment"
              title="Add attachment (Storage integration scheduled for next release)"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--foreground-muted)] dark:text-[#8e8a91] hover:text-[var(--foreground)] dark:hover:text-white transition-colors active:scale-95"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={stopTyping}
              onKeyDown={handleKeyDown}
              placeholder={
                editingMessage
                  ? 'Edit message…'
                  : replyingTo
                  ? `Reply to ${replyingTo.senderName}…`
                  : 'Send a message...'
              }
              aria-label={
                editingMessage
                  ? 'Edit message'
                  : replyingTo
                  ? `Reply to ${replyingTo.senderName}`
                  : 'Send a message'
              }
              rows={1}
              disabled={disabled}
              className={cn(
                'flex-1 min-w-0 resize-none bg-transparent leading-relaxed text-[var(--foreground)] dark:text-white',
                'text-[14px] sm:text-[14.5px] placeholder:text-[var(--foreground-ghost)] dark:placeholder:text-[#7d7981]',
                'focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'max-h-[140px] py-0.5',
              )}
            />
          </div>

          {/* Calendar Utility Button */}
          <button
            type="button"
            aria-label="Calendar"
            title="Calendar scheduling (Coming in next release)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-black/[0.03] dark:bg-[#2c2a30] hover:bg-black/[0.06] dark:hover:bg-[#343138] border border-black/[0.06] dark:border-white/[0.08] text-[var(--foreground-muted)] dark:text-[#8e8a91] hover:text-[var(--foreground)] dark:hover:text-white transition-all active:scale-95 shadow-2xs"
          >
            <Calendar className="h-4 w-4" />
          </button>

          {/* Microphone / Send Action Button */}
          <button
            type="button"
            onClick={canSubmit ? handleSubmit : undefined}
            onMouseDown={(e) => {
              if (canSubmit) e.preventDefault();
            }}
            onPointerDown={(e) => {
              if (canSubmit) e.preventDefault();
            }}
            disabled={disabled}
            aria-label={editingMessage ? 'Save changes' : canSubmit ? 'Send message' : 'Voice message'}
            title={editingMessage ? 'Save changes (Enter)' : canSubmit ? 'Send message (Enter)' : 'Voice message'}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150 ease-spring active:scale-90 shadow-2xs',
              canSubmit
                ? 'bg-wine text-white hover:bg-wine-hover dark:bg-white dark:text-[#19171b] dark:hover:bg-white/90 shadow-md scale-100'
                : 'bg-black/[0.03] dark:bg-[#2c2a30] hover:bg-black/[0.06] dark:hover:bg-[#343138] border border-black/[0.06] dark:border-white/[0.08] text-[var(--foreground-muted)] dark:text-[#8e8a91] hover:text-[var(--foreground)] dark:hover:text-white',
            )}
          >
            <span className="relative flex items-center justify-center h-4 w-4">
              {editingMessage ? (
                <Check key="check" className="h-4 w-4 stroke-[2.4] animate-icon-spring" />
              ) : canSubmit ? (
                <ArrowUp key="send" className="h-4 w-4 stroke-[2.4] animate-icon-spring" />
              ) : (
                <Mic key="mic" className="h-4 w-4 animate-icon-spring" />
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

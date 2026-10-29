'use client';

import { useState, useId, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, ArrowUp, Info, ShieldCheck, Sparkles } from 'lucide-react';
import type { Group, GroupMessage } from '@/lib/groups/group-data';
import { NexusAvatar3D } from '@/components/user/nexus-avatar-3d';
import { cn } from '@/lib/utils/cn';

interface GroupPreviewModalProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (groupId: string, message: GroupMessage) => void;
}

export function GroupPreviewModal({
  group,
  isOpen,
  onClose,
  onSendMessage,
}: GroupPreviewModalProps) {
  const titleId = useId();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [group?.sampleMessages.length, isOpen]);

  if (!isOpen || !group) return null;

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMsg: GroupMessage = {
      id: `gmsg-${Date.now()}`,
      senderName: 'You',
      senderInitials: 'ME',
      content: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    onSendMessage(group.id, newMsg);
    setInputText('');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 bg-charcoal/40 dark:bg-black/60 backdrop-blur-sm animate-backdrop-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-2xl overflow-hidden rounded-t-3xl border border-stone/80 dark:border-[#3B2C34]',
          'glass-surface bg-white/95 dark:bg-[#231B20]/95 shadow-2xl sm:rounded-3xl animate-dialog-enter',
          'h-[88dvh] sm:h-[80dvh] flex flex-col',
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-stone/80 dark:border-[#3B2C34] px-5 py-4 bg-porcelain/75 dark:bg-[#1C1619]/75 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-sm text-white shadow-xs"
              style={{ backgroundColor: group.visualTheme.primary }}
            >
              {group.monogram}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id={titleId}
                  className="text-base font-bold tracking-tight text-charcoal sm:text-lg"
                >
                  {group.name}
                </h2>
                <span className="rounded-full bg-wine/10 dark:bg-wine/25 px-2 py-0.5 text-[10.5px] font-bold text-wine dark:text-[#C49DA4]">
                  Demo Group
                </span>
              </div>
              <p className="text-[12px] text-muted flex items-center gap-2">
                <span>{group.memberCount} members</span>
                <span>&middot;</span>
                <span className="truncate max-w-[200px] sm:max-w-xs">{group.topic}</span>
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close group view"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone/70 bg-white/80 dark:bg-[#1C1619]/80 text-muted transition-transform duration-120 hover:text-charcoal active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Demo Notification Banner */}
        <div className="shrink-0 bg-wine/5 dark:bg-wine/15 border-b border-wine/10 px-4 py-2 text-[11.5px] text-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-wine dark:text-[#C49DA4]">
            <Info className="h-3.5 w-3.5" />
            Illustrative Group Channel &middot; Messages are stored in local demo state
          </span>
          <span className="text-[10.5px] text-muted-faint hidden sm:inline">
            Press Enter to test sending
          </span>
        </div>

        {/* Message Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 bg-porcelain/30 dark:bg-[#1C1619]/30"
        >
          {group.sampleMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2.5',
                msg.isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              {!msg.isOwn && (
                <div className="shrink-0">
                  <NexusAvatar3D id={msg.senderName} name={msg.senderName} size="xs" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-4 py-2.5 shadow-xs',
                  msg.isOwn
                    ? 'bg-wine text-white rounded-br-xs'
                    : 'bg-white dark:bg-[#271E23] border border-stone/70 dark:border-[#3B2C34] text-charcoal rounded-bl-xs'
                )}
              >
                {!msg.isOwn && (
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-wine dark:text-[#C49DA4]">
                      {msg.senderName}
                    </span>
                  </div>
                )}
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Group Message Composer */}
        <div className="shrink-0 p-3 sm:p-4 bg-white dark:bg-[#231B20] border-t border-stone/80 dark:border-[#3B2C34]">
          <div className="flex items-center gap-2 rounded-2xl border border-stone bg-porcelain/60 dark:bg-wine/5 px-3.5 py-2 focus-within:bg-white dark:focus-within:bg-[#271E23] focus-within:border-wine focus-within:ring-2 focus-within:ring-wine/10">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${group.name} (demo)…`}
              className="flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-charcoal focus:outline-none placeholder:text-muted-faint"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim()}
              aria-label="Send test message"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-120 ease-out active:scale-95',
                inputText.trim()
                  ? 'bg-wine text-white shadow-xs hover:bg-wine-hover'
                  : 'bg-stone/60 text-muted-faint cursor-not-allowed'
              )}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

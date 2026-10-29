'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Sparkles, Check, Info, Shield, Hash } from 'lucide-react';
import type { Community } from '@/lib/communities/community-data';
import { cn } from '@/lib/utils/cn';

interface CommunityPreviewModalProps {
  community: Community | null;
  isOpen: boolean;
  onClose: () => void;
  isJoined: boolean;
  onToggleJoin: (communityId: string) => void;
}

export function CommunityPreviewModal({
  community,
  isOpen,
  onClose,
  isJoined,
  onToggleJoin,
}: CommunityPreviewModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

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
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !community) return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 bg-charcoal/40 dark:bg-black/60 backdrop-blur-sm animate-backdrop-fade"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-stone/80 dark:border-[#3B2C34]',
          'glass-surface bg-white/95 dark:bg-[#231B20]/95 shadow-2xl sm:rounded-3xl animate-dialog-enter',
          'max-h-[90dvh] flex flex-col',
        )}
      >
        {/* Decorative Top Accent Banner */}
        <div
          className={cn(
            'h-24 w-full shrink-0 bg-gradient-to-r relative px-6 py-4 flex items-end',
            community.visualTheme.cardHighlight,
          )}
          style={{ backgroundColor: `${community.visualTheme.primary}12` }}
        >
          {/* Close button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close community preview"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-stone/70 bg-white/80 dark:bg-[#1C1619]/80 text-muted backdrop-blur-sm transition-all duration-150 hover:bg-white hover:text-charcoal active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Category Pill */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold border backdrop-blur-xs',
              community.visualTheme.border,
              community.visualTheme.bgBadge,
              community.visualTheme.textBadge,
            )}
          >
            <Sparkles className="h-3 w-3" />
            {community.category}
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5 space-y-5">
          {/* Masthead */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-lg text-white shadow-sm"
                  style={{ backgroundColor: community.visualTheme.primary }}
                >
                  {community.badge}
                </div>
                <div>
                  <h2
                    id={titleId}
                    className="text-xl font-bold tracking-tight text-charcoal sm:text-2xl"
                  >
                    {community.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="h-3.5 w-3.5" />
                      {community.memberCount.toLocaleString()} members
                    </span>
                    <span>&middot;</span>
                    <span className="text-emerald-700 font-medium">
                      {community.onlineCount} online
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleJoin(community.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-150 ease-out active:scale-95',
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
                <span>Join Community</span>
              )}
            </button>
          </div>

          {/* Demo notice pill */}
          <div className="rounded-xl border border-stone-subtle dark:border-[#3B2C34]/60 bg-porcelain/60 dark:bg-wine/5 p-3 text-[12px] text-muted flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-wine mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-charcoal font-semibold">Demo Community:</strong> This is an illustrative sample community showcasing Nexus.talks visual styling and interaction flows. Membership state is saved locally.
            </p>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              About this Community
            </h3>
            <p className="text-[13.5px] leading-relaxed text-charcoal">
              {community.description}
            </p>
          </div>

          {/* Sample Discussion Topics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Popular Topics
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {community.topics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-stone/70 dark:border-[#3B2C34]/60 bg-white/60 dark:bg-wine/5 p-2.5 text-[12px] text-charcoal"
                >
                  <Hash className="h-3.5 w-3.5 text-muted shrink-0" />
                  <span className="truncate">{topic}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Community Guidelines */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-wine" />
              Community Guidelines
            </h3>
            <ul className="space-y-1.5 text-[12.5px] text-muted">
              {community.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-wine shrink-0" />
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

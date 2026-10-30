'use client';

import { useEffect, useRef } from 'react';
import {
  SquarePen,
  Users,
  Layers,
  Globe,
  X,
  ArrowRight,
  Command,
  Bookmark,
  Activity,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type DemoActionTab = 'messages' | 'pulse' | 'echoes' | 'discovery' | 'communities' | 'groups' | 'settings';

interface DemoActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectTab: (tab: DemoActionTab) => void;
  onOpenCommand: () => void;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  action: DemoActionTab | 'command';
  badge?: string;
}

const ACTION_ITEMS: ActionItem[] = [
  {
    id: 'nexus-command',
    title: 'Nexus Command',
    description: 'Instant search, quick actions, navigation, and settings',
    icon: Command,
    action: 'command',
    badge: '⌘K',
  },
  {
    id: 'nexus-pulse',
    title: 'Nexus Pulse',
    description: 'Overview of recent activity and unread threads',
    icon: Activity,
    action: 'pulse',
    badge: 'Live',
  },
  {
    id: 'nexus-echoes',
    title: 'Nexus Echoes',
    description: 'Saved moments, bookmarked messages, and private notes',
    icon: Bookmark,
    action: 'echoes',
    badge: 'Saved',
  },
  {
    id: 'new-dm',
    title: 'New Direct Message',
    description: 'Start a 1-on-1 private conversation with any member',
    icon: SquarePen,
    action: 'messages',
    badge: 'Direct',
  },
  {
    id: 'people-dir',
    title: 'Discover People',
    description: 'Browse member profiles, active status, and connect',
    icon: Users,
    action: 'discovery',
    badge: 'Directory',
  },
  {
    id: 'create-group',
    title: 'Create a Group',
    description: 'Start a collaborative circle, project channel, or team topic',
    icon: Layers,
    action: 'groups',
    badge: 'Group',
  },
  {
    id: 'explore-communities',
    title: 'Explore Communities',
    description: 'Browse curated forums, creative salons, and public rooms',
    icon: Globe,
    action: 'communities',
    badge: 'Public',
  },
  {
    id: 'my-settings',
    title: 'Settings & Appearance',
    description: 'Switch luxury themes and configure your reading experience',
    icon: Settings,
    action: 'settings',
    badge: 'Settings',
  },
];

export function DemoActionSheet({
  open,
  onClose,
  onSelectTab,
  onOpenCommand,
}: DemoActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Auto focus first item on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Prevent body scroll when sheet is open on mobile
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  const handleSelect = (item: ActionItem) => {
    onClose();
    if (item.action === 'command') {
      onOpenCommand();
    } else {
      onSelectTab(item.action);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-create-sheet-title"
      className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4 nx-backdrop-in"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-charcoal/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        className={cn(
          'relative z-10 w-full md:max-w-md overflow-hidden rounded-t-[32px] md:rounded-[32px]',
          'liquid-glass-card',
          'border border-stone/80 dark:border-[#4A3843]/80',
          'shadow-2xl shadow-charcoal/25 dark:shadow-black/70',
          'pb-[calc(1.75rem+env(safe-area-inset-bottom))] md:pb-6 pt-3 px-4 sm:px-6',
          'nx-sheet-enter md:nx-dialog-enter',
        )}
      >
        {/* Drag Handle Bar (mobile visual cue) */}
        <div className="flex justify-center pb-2 md:hidden">
          <span className="h-1.5 w-10 rounded-full bg-stone-strong/40 dark:bg-[#4D3944]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 pt-1 border-b border-stone-subtle dark:border-[#33252E]">
          <div className="min-w-0">
            <h2
              id="demo-create-sheet-title"
              className="text-[18px] font-bold tracking-tight text-charcoal dark:text-foreground"
            >
              Start or Discover
            </h2>
            <p className="text-[12px] text-muted dark:text-muted-foreground">
              Choose an action or navigate demo spaces
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-charcoal hover:bg-porcelain dark:hover:bg-[#2C2128] transition-colors active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Action Options List */}
        <div
          className="mt-3 space-y-1.5 max-h-[calc(85vh-100px)] overflow-y-auto overscroll-contain pr-0.5 no-scrollbar scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {ACTION_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                ref={index === 0 ? firstButtonRef : undefined}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  'group flex w-full items-center gap-3.5 rounded-2xl p-3 text-left',
                  'transition-[background-color,border-color,transform] duration-150 ease-out',
                  'border border-transparent hover:border-stone/80 dark:hover:border-[#3B2C34]',
                  'hover:bg-porcelain/90 dark:hover:bg-[#271E24] active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#E2A6B3] transition-colors group-hover:bg-wine group-hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-charcoal dark:text-foreground group-hover:text-wine dark:group-hover:text-[#F7B6C4] transition-colors shrink-0">
                      {item.title}
                    </span>
                    {item.badge === '⌘K' ? (
                      <>
                        <span className="hidden sm:inline-flex shrink-0 rounded-full bg-stone-subtle dark:bg-[#342730] px-2 py-0.5 text-[10px] font-medium text-muted">
                          ⌘K
                        </span>
                        <span className="inline-flex sm:hidden shrink-0 rounded-full bg-stone-subtle dark:bg-[#342730] px-2 py-0.5 text-[10px] font-medium text-muted">
                          Quick
                        </span>
                      </>
                    ) : item.badge ? (
                      <span className="shrink-0 rounded-full bg-stone-subtle dark:bg-[#342730] px-2 py-0.5 text-[10px] font-medium text-muted">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted dark:text-muted-foreground [overflow-wrap:anywhere]">
                    {item.description}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-[opacity,transform] duration-150" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

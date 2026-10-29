'use client';

import { useState, useId, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Info, Layers, Check } from 'lucide-react';
import type { Group } from '@/lib/groups/group-data';
import { cn } from '@/lib/utils/cn';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (group: Group) => void;
}

const THEME_OPTIONS = [
  {
    id: 'wine',
    label: 'Deep Wine & Rose',
    primary: '#542C38',
    accent: '#A77982',
    badgeBg: 'bg-wine/10 dark:bg-wine/25',
    badgeText: 'text-wine dark:text-[#C49DA4]',
    border: 'border-wine/20',
  },
  {
    id: 'charcoal',
    label: 'Porcelain & Charcoal',
    primary: '#292628',
    accent: '#777174',
    badgeBg: 'bg-stone/60 dark:bg-stone/20',
    badgeText: 'text-charcoal dark:text-porcelain',
    border: 'border-stone-strong/40',
  },
  {
    id: 'burgundy',
    label: 'Burgundy & Warm',
    primary: '#6A3947',
    accent: '#542C38',
    badgeBg: 'bg-burgundy/10 dark:bg-burgundy/25',
    badgeText: 'text-burgundy dark:text-[#C49DA4]',
    border: 'border-burgundy/20',
  },
  {
    id: 'dark',
    label: 'Dark Wine & Stone',
    primary: '#21191D',
    accent: '#E8E2DE',
    badgeBg: 'bg-stone/50 dark:bg-stone/20',
    badgeText: 'text-charcoal dark:text-porcelain',
    border: 'border-stone/80',
  },
];

export function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(THEME_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Group name is required.');
      return;
    }
    if (trimmedName.length < 3) {
      setError('Group name must be at least 3 characters.');
      return;
    }

    const initials = trimmedName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const newGroup: Group = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      description: description.trim() || 'A new workspace group for collaborative messaging.',
      topic: topic.trim() || 'General discussion & coordination',
      memberCount: 1,
      onlineCount: 1,
      monogram: initials || 'GP',
      visualTheme: {
        primary: selectedTheme.primary,
        accent: selectedTheme.accent,
        badgeBg: selectedTheme.badgeBg,
        badgeText: selectedTheme.badgeText,
        border: selectedTheme.border,
      },
      sampleMessages: [
        {
          id: `msg-${Date.now()}`,
          senderName: 'You',
          senderInitials: initials || 'ME',
          content: `Created ${trimmedName}. Welcome to the group!`,
          time: 'Just now',
          isOwn: true,
        },
      ],
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    onCreateGroup(newGroup);
    setName('');
    setDescription('');
    setTopic('');
    setError(null);
    onClose();
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
          'relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-stone/80 dark:border-[#3B2C34]',
          'glass-surface bg-white/95 dark:bg-[#231B20]/95 shadow-2xl sm:rounded-3xl animate-dialog-enter',
          'max-h-[90dvh] flex flex-col',
        )}
      >
        {/* Top Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-stone/70 dark:border-[#3B2C34]/60 px-6 py-4.5 bg-porcelain/60 dark:bg-wine/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine/10 text-wine dark:bg-wine/25 shadow-xs">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2
                id={titleId}
                className="text-lg font-bold tracking-tight text-charcoal"
              >
                Create New Group
              </h2>
              <p className="text-[11.5px] text-muted">
                Start a collaborative space for your team or project.
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Cancel and close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone/70 bg-white/80 dark:bg-[#1C1619]/80 text-muted transition-all hover:text-charcoal active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5">
          {error && (
            <div className="rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2 text-xs font-semibold text-wine animate-fade-in">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="group-name"
              className="block text-xs font-bold uppercase tracking-wider text-charcoal"
            >
              Group Name <span className="text-wine">*</span>
            </label>
            <input
              id="group-name"
              ref={inputRef}
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Design Systems, Morning Sprints"
              maxLength={40}
              className="search-input w-full rounded-xl py-2 px-3 text-[13.5px] bg-white dark:bg-[#231B20] border border-stone shadow-sm focus:border-wine focus:ring-2 focus:ring-wine/10"
            />
          </div>

          {/* Group Topic */}
          <div className="space-y-1.5">
            <label
              htmlFor="group-topic"
              className="block text-xs font-bold uppercase tracking-wider text-charcoal"
            >
              Topic or Focus
            </label>
            <input
              id="group-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Weekly UX design reviews & tokens"
              maxLength={60}
              className="search-input w-full rounded-xl py-2 px-3 text-[13.5px] bg-white dark:bg-[#231B20] border border-stone shadow-sm focus:border-wine focus:ring-2 focus:ring-wine/10"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="group-description"
              className="block text-xs font-bold uppercase tracking-wider text-charcoal"
            >
              Description (Optional)
            </label>
            <textarea
              id="group-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this group gathers for…"
              maxLength={160}
              className="search-input w-full rounded-xl py-2 px-3 text-[13px] bg-white dark:bg-[#231B20] border border-stone shadow-sm resize-none focus:border-wine focus:ring-2 focus:ring-wine/10"
            />
          </div>

          {/* Color Theme Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
              Visual Palette
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = selectedTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-all active:scale-95',
                      isSelected
                        ? 'border-wine bg-wine/10 text-wine dark:bg-wine/25 font-bold shadow-xs'
                        : 'border-stone bg-white dark:bg-[#231B20] text-muted hover:border-stone-strong',
                    )}
                  >
                    <span
                      className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-white text-[9px]"
                      style={{ backgroundColor: theme.primary }}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </span>
                    <span className="truncate text-[11px] font-semibold">{theme.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Demo note */}
          <div className="rounded-xl border border-stone-subtle dark:border-[#3B2C34]/60 bg-porcelain/60 dark:bg-wine/5 p-3 text-[11.5px] text-muted flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 text-wine mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-charcoal font-semibold">Demo Group Creation:</strong> New groups are created in local demo state and persisted to your browser session.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-subtle dark:border-[#3B2C34]/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone bg-white dark:bg-[#231B20] px-4 py-2 text-xs font-medium text-charcoal transition-all hover:bg-porcelain active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-wine px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-wine-hover active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

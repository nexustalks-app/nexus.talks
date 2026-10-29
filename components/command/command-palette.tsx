'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Command,
  ArrowRight,
  Loader2,
  Sparkles,
  User,
  MessageSquare,
  Compass,
  Layers,
  Settings,
  CornerDownLeft,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { useCommand } from '@/lib/command/command-context';
import type {
  NexusCommand,
  CommandCategory,
  CommandGroup,
} from '@/lib/command/command-types';
import { getDefaultCommands } from '@/lib/command/command-registry';
import { useSettings } from '@/lib/settings/settings-context';
import { NexusAvatar3D } from '@/components/user/nexus-avatar-3d';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';

const CATEGORY_ORDER: { category: CommandCategory; label: string }[] = [
  { category: 'context', label: 'Current Conversation' },
  { category: 'actions', label: 'Quick Actions' },
  { category: 'conversations', label: 'Conversations' },
  { category: 'people', label: 'People & Contacts' },
  { category: 'navigate', label: 'Navigation' },
  { category: 'preferences', label: 'Preferences' },
  { category: 'demo', label: 'Nexus Demo Experience' },
];

export function CommandPalette() {
  const { isOpen, close, registeredCommands, appContext } = useCommand();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    settings,
    updateAppearance,
    updateAccessibility,
    updateNotifications,
    resolvedTheme,
  } = useSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [remotePeople, setRemotePeople] = useState<NexusCommand[]>([]);
  const [remoteConversations, setRemoteConversations] = useState<NexusCommand[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setRemotePeople([]);
      setRemoteConversations([]);
      setRemoteError(null);
      // Auto-focus input on open
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  // Global Escape key listener while palette is open
  useEffect(() => {
    if (!isOpen) return;

    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, close]);

  // Generate built-in default commands
  const defaultCommands = useMemo(() => {
    return getDefaultCommands({
      router,
      close,
      context: appContext,
      settings,
      updateAppearance,
      updateAccessibility,
      updateNotifications,
      resolvedTheme,
      onDemoSelectContact: (contactId) => {
        // Find contact button in demo DOM or dispatch demo selection
        const contactBtn = document.querySelector(`[data-contact-id="${contactId}"]`) as HTMLButtonElement | null;
        if (contactBtn) {
          contactBtn.click();
        } else {
          // Fallback: look for button by contact name
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find((b) => b.textContent?.toLowerCase().includes(contactId.replace('contact-', '')));
          btn?.click();
        }
      },
      onDemoSelectTab: (tab) => {
        const tabBtn = document.querySelector(`[data-demo-tab="${tab}"]`) as HTMLButtonElement | null;
        if (tabBtn) {
          tabBtn.click();
        } else {
          const btns = Array.from(document.querySelectorAll<HTMLElement>('button, nav a'));
          const target = btns.find((b) => b.textContent?.toLowerCase().includes(tab));
          target?.click();
        }
      },
      onDemoOpenLivingProfile: (contactId) => {
        const btn = document.querySelector(`[data-living-profile-id="${contactId}"]`) as HTMLButtonElement | null;
        btn?.click();
      },
      onDemoOpenStories: (profileId) => {
        const btn = document.querySelector(`[data-status-profile-id="${profileId}"]`) as HTMLButtonElement | null;
        btn?.click();
      },
    });
  }, [
    router,
    close,
    appContext,
    settings,
    updateAppearance,
    updateAccessibility,
    updateNotifications,
    resolvedTheme,
  ]);

  // Combine static defaults, dynamically registered commands, and remote search results
  const allCommands = useMemo(() => {
    // Filter by context visibility
    const visibleStatic = [...defaultCommands, ...registeredCommands].filter((cmd) => {
      if (cmd.isVisible) return cmd.isVisible(appContext);
      return true;
    });

    const combined = [...visibleStatic, ...remoteConversations, ...remotePeople];
    // Deduplicate commands by unique stable ID
    const seen = new Set<string>();
    return combined.filter((cmd) => {
      if (seen.has(cmd.id)) return false;
      seen.add(cmd.id);
      return true;
    });
  }, [defaultCommands, registeredCommands, remoteConversations, remotePeople, appContext]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) {
      // When query is empty, show default recommended commands (context, quick actions, navigate, demo)
      return allCommands.filter((cmd) => cmd.category !== 'messages');
    }

    // Split search terms for multi-keyword matching
    const terms = clean.split(/\s+/).filter(Boolean);

    return allCommands.filter((cmd) => {
      const matchText = [
        cmd.title,
        cmd.subtitle || '',
        ...(cmd.keywords || []),
        cmd.category,
      ]
        .join(' ')
        .toLowerCase();

      return terms.every((t) => matchText.includes(t));
    });
  }, [allCommands, query]);

  // Group filtered commands by category
  const groupedCommands = useMemo<CommandGroup[]>(() => {
    const map = new Map<CommandCategory, NexusCommand[]>();

    filteredCommands.forEach((cmd) => {
      const list = map.get(cmd.category) || [];
      list.push(cmd);
      map.set(cmd.category, list);
    });

    const groups: CommandGroup[] = [];
    CATEGORY_ORDER.forEach(({ category, label }) => {
      const cmds = map.get(category);
      if (cmds && cmds.length > 0) {
        groups.push({ category, label, commands: cmds });
      }
    });

    return groups;
  }, [filteredCommands]);

  // Flattened array of visible commands to manage linear keyboard selection
  const flatSelectableCommands = useMemo(() => {
    const list: NexusCommand[] = [];
    groupedCommands.forEach((group) => {
      list.push(...group.commands);
    });
    return list;
  }, [groupedCommands]);

  // Ensure selectedIndex is always within valid range
  useEffect(() => {
    if (selectedIndex >= flatSelectableCommands.length) {
      setSelectedIndex(Math.max(0, flatSelectableCommands.length - 1));
    }
  }, [flatSelectableCommands.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen) return;
    const activeEl = document.getElementById(`nexus-cmd-item-${selectedIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isOpen]);

  // ── Debounced Remote Search (Authenticated Mode Only) ─────────────────────────
  useEffect(() => {
    const clean = query.trim();

    // In demo mode: search is 100% in-memory; do not trigger any fetch calls!
    if (appContext.isDemo || !appContext.isAuthenticated) {
      return;
    }

    // Only search remotely if query has at least 2 characters
    if (clean.length < 2) {
      setRemotePeople([]);
      setRemoteConversations([]);
      setRemoteError(null);
      setIsSearchingRemote(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      setRemoteError(null);

      try {
        // 1. Search People via /api/users/search (if starts with @ or query looks like username)
        const cleanUsername = clean.replace(/^@+/, '').trim();
        if (cleanUsername.length >= 3) {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(cleanUsername)}`, {
            signal: controller.signal,
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              const u = data.user;
              const personCommand: NexusCommand = {
                id: `remote-user-${u.id}`,
                title: u.display_name,
                subtitle: `@${u.username} ${u.bio ? `· ${u.bio}` : ''}`,
                category: 'people',
                keywords: [u.display_name, u.username, 'user', 'people'],
                avatarUrl: u.avatar_url,
                initials: u.display_name.slice(0, 2).toUpperCase(),
                badge: u.status === 'online' ? 'Online' : undefined,
                badgeVariant: 'emerald',
                action: () => {
                  close();
                  router.push(`/conversations?newWith=${u.id}`);
                },
              };
              setRemotePeople([personCommand]);
            } else {
              setRemotePeople([]);
            }
          }
        }

        // 2. Search Conversations via Client Supabase
        const supabase = createClient();
        const { data: convMembers, error: convErr } = await supabase
          .from('conversation_members')
          .select(`
            conversation_id,
            conversations:conversation_id (
              id,
              name,
              type,
              updated_at
            )
          `)
          .limit(20);

        if (!convErr && convMembers) {
          const matchingConvs: NexusCommand[] = [];
          for (const cm of convMembers) {
            const c = cm.conversations as unknown as { id: string; name?: string; type: string } | null;
            if (c && c.name && c.name.toLowerCase().includes(clean.toLowerCase())) {
              matchingConvs.push({
                id: `remote-conv-${c.id}`,
                title: c.name,
                subtitle: `${c.type === 'group' ? 'Group conversation' : 'Direct conversation'}`,
                category: 'conversations',
                keywords: [c.name, c.type],
                icon: c.type === 'group' ? Layers : MessageSquare,
                action: () => {
                  close();
                  router.push(`/conversations/${c.id}`);
                },
              });
            }
          }
          setRemoteConversations(matchingConvs);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setRemoteError('Failed to search online directory');
      } finally {
        setIsSearchingRemote(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, appContext.isDemo, appContext.isAuthenticated, close, router]);

  // Execute selected command
  const executeCommand = useCallback(
    (command: NexusCommand) => {
      if (command.disabled) return;
      command.action();
    },
    []
  );

  // Keyboard navigation inside command palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatSelectableCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatSelectableCommands.length - 1
        );
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatSelectableCommands[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
        return;
      }
    },
    [close, flatSelectableCommands, selectedIndex, executeCommand]
  );

  if (!mounted || !isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nexus Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 md:pt-20 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* ── Command Surface Panel ────────────────────────────────────────── */}
      <div
        className={cn(
          'relative flex flex-col w-full max-w-2xl max-h-[85vh] sm:max-h-[75vh]',
          'rounded-3xl border border-stone/80 dark:border-[#4A3843]/80',
          'liquid-glass-card shadow-2xl overflow-hidden transition-all',
          'animate-in zoom-in-95 duration-150'
        )}
      >
        {/* ── Search Input Header ──────────────────────────────────────────── */}
        <div className="relative flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <Search className="w-5 h-5 text-wine shrink-0" strokeWidth={2.2} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              appContext.isDemo
                ? 'Command demo... (Try "Aasif", "Stories", "Discovery", "Theme")'
                : 'Type a command, search people, conversations, or settings...'
            }
            aria-label="Search commands, conversations, people"
            aria-autocomplete="list"
            aria-controls="nexus-cmd-results"
            className="flex-1 bg-transparent text-[14.5px] font-medium text-charcoal dark:text-[#F7F4F1] placeholder-muted focus:outline-none"
          />

          {isSearchingRemote && (
            <Loader2 className="w-4 h-4 text-wine animate-spin shrink-0" />
          )}

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear query"
              className="p-1 rounded-md text-muted hover:text-charcoal dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={close}
            aria-label="Close command palette"
            className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--surface-subtle,var(--surface))] text-[var(--foreground-muted)] border border-[var(--border)]"
          >
            Esc
          </button>
        </div>

        {/* ── Command Results List ─────────────────────────────────────────── */}
        <div
          ref={listRef}
          id="nexus-cmd-results"
          role="listbox"
          className="flex-1 overflow-y-auto px-2 py-2 divide-y divide-stone/40 dark:divide-wine/10"
          style={{ overscrollBehavior: 'contain' }}
        >
          {remoteError && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg mx-1 my-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{remoteError}</span>
            </div>
          )}

          {groupedCommands.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-wine/10 dark:bg-wine/20 text-wine mb-3">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-charcoal dark:text-foreground">
                No commands matching &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                {appContext.isDemo
                  ? 'Try searching for demo contacts like Aasif or Elena, or switch themes.'
                  : 'Try searching for an exact username with @, or navigate to Messages or Settings.'}
              </p>
            </div>
          ) : (
            groupedCommands.map((group) => (
              <div key={group.category} className="py-1.5 first:pt-0 last:pb-0">
                {/* Category Header */}
                <div className="px-3 py-1 text-[10.5px] font-mono font-bold tracking-wider uppercase text-muted">
                  {group.label}
                </div>

                {/* Command Items in this Category */}
                <div className="mt-0.5 space-y-0.5">
                  {group.commands.map((cmd) => {
                    const currentIndex = flatSelectableCommands.indexOf(cmd);
                    const isSelected = currentIndex === selectedIndex;
                    const IconComponent = cmd.icon;

                    return (
                      <div
                        key={cmd.id}
                        id={`nexus-cmd-item-${currentIndex}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          'group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-120 text-left select-none',
                          isSelected
                            ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] shadow-2xs'
                            : 'hover:bg-porcelain/80 dark:hover:bg-wine/10 text-charcoal dark:text-[#E8E2DE]'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Leading Visual (Icon or Avatar) */}
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-semibold text-xs transition-colors',
                              isSelected
                                ? 'bg-wine text-white'
                                : 'bg-porcelain dark:bg-wine/15 text-muted border border-stone/60 dark:border-wine/20'
                            )}
                          >
                            {cmd.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cmd.avatarUrl}
                                alt={cmd.title}
                                className="h-full w-full rounded-lg object-cover"
                              />
                            ) : cmd.initials ? (
                              <NexusAvatar3D id={cmd.id} name={cmd.title} size="xs" className="h-full w-full rounded-lg" />
                            ) : IconComponent ? (
                              <IconComponent className="w-4 h-4" />
                            ) : (
                              <Command className="w-4 h-4" />
                            )}
                          </div>

                          {/* Titles */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-sm font-semibold truncate',
                                  isSelected
                                    ? 'text-wine dark:text-[#F7B6C4]'
                                    : 'text-charcoal dark:text-foreground'
                                )}
                              >
                                {cmd.title}
                              </span>

                              {cmd.badge && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                    cmd.badgeVariant === 'wine'
                                      ? 'bg-wine/15 text-wine dark:bg-wine/40 dark:text-[#F3B3C2]'
                                      : cmd.badgeVariant === 'emerald'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-porcelain text-muted dark:bg-stone/20'
                                  )}
                                >
                                  {cmd.badge}
                                </span>
                              )}
                            </div>

                            {cmd.subtitle && (
                              <p className="text-[12px] text-muted truncate mt-0.5">
                                {cmd.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Trailing Indicator / Shortcut */}
                        <div className="flex items-center gap-2 shrink-0">
                          {cmd.shortcut && (
                            <div className="hidden sm:flex items-center gap-1">
                              {cmd.shortcut.map((key) => (
                                <kbd
                                  key={key}
                                  className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-semibold bg-porcelain dark:bg-wine/20 text-muted border border-stone/60 dark:border-wine/30"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}

                          <CornerDownLeft
                            className={cn(
                              'w-3.5 h-3.5 transition-opacity',
                              isSelected ? 'opacity-100 text-wine dark:text-[#F3B3C2]' : 'opacity-0'
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer Info & Signature ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-subtle,var(--surface))] border-t border-[var(--border)] text-[11px] text-[var(--foreground-muted)]">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px] font-mono text-[var(--foreground-muted)]">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px] font-mono text-[var(--foreground-muted)]">↵</kbd>
              <span>select</span>
            </span>
            <span className="inline-flex sm:hidden">Tap any action to open</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-[var(--foreground-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#F3B3C2]" />
            <span>POWERED BY AASIF</span>
          </div>
        </div>
      </div>
    </div>
  );
}

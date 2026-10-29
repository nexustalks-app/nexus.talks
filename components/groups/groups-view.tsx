'use client';

import { useState, useEffect } from 'react';
import { Search, X, Plus, Layers, Users, MessageSquare, Info, Check, ArrowRight } from 'lucide-react';
import { INITIAL_GROUPS, type Group, type GroupMessage } from '@/lib/groups/group-data';
import { CreateGroupModal } from './create-group-modal';
import { GroupPreviewModal } from './group-preview-modal';
import { cn } from '@/lib/utils/cn';

export function GroupsView() {
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load custom groups and persisted messages from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === '1') {
        setCreateModalOpen(true);
      }
    }
    try {
      const raw = localStorage.getItem('nx_demo_groups');
      if (raw) {
        const parsed: Group[] = JSON.parse(raw);
        // Merge custom groups with initial groups
        const customOnly = parsed.filter((g) => g.isCustom);
        setGroups([...INITIAL_GROUPS, ...customOnly]);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveGroups = (nextGroups: Group[]) => {
    setGroups(nextGroups);
    try {
      localStorage.setItem('nx_demo_groups', JSON.stringify(nextGroups));
    } catch {
      // ignore
    }
  };

  const handleCreateGroup = (newGroup: Group) => {
    const updated = [newGroup, ...groups];
    saveGroups(updated);
    setToastMessage(`Created group "${newGroup.name}" (Saved to demo state)`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSendMessage = (groupId: string, message: GroupMessage) => {
    const updated = groups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          sampleMessages: [...g.sampleMessages, message],
        };
      }
      return g;
    });
    saveGroups(updated);
    if (activeGroup?.id === groupId) {
      setActiveGroup((prev) =>
        prev
          ? {
              ...prev,
              sampleMessages: [...prev.sampleMessages, message],
            }
          : null
      );
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(query) ||
      g.topic.toLowerCase().includes(query) ||
      g.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-full flex-col bg-porcelain select-none overflow-y-auto overscroll-contain">
      {/* ── Signature Glass Header ───────────────────────────────────────── */}
      <div className="shrink-0 glass-header border-b border-stone/80 bg-white/85 dark:bg-[#1C1619]/85 backdrop-blur-md px-5 py-5 sm:px-10 sm:py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine/10 text-wine dark:bg-wine/25 shadow-xs">
                  <Layers className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground sm:text-3xl">
                  Groups
                </h1>
              </div>
              <p className="mt-1 text-xs text-muted sm:text-[13.5px]">
                Collaborative team circles, project channels, and interest groups.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-wine px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-wine-hover active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {/* Search bar & demo banner */}
          <div className="mt-5 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groups by name or focus topic…"
                aria-label="Search groups"
                className="search-input w-full rounded-xl py-2.5 pl-10 pr-9 text-[13.5px] bg-white dark:bg-[#231B20] border border-stone shadow-sm focus:border-wine focus:ring-2 focus:ring-wine/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-transform duration-120 ease-out hover:text-charcoal active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11.5px] text-muted">
              <Info className="h-3.5 w-3.5 text-wine shrink-0" />
              <span>
                Demonstration Groups &middot; Multi-party workspaces distinct from 1-to-1 chats and public communities.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Groups List ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-6 sm:px-10 sm:py-8 pb-28 lg:pb-10">
        <div className="mx-auto max-w-6xl">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-wine/20 bg-wine/10 dark:bg-wine/25 px-4 py-2.5 text-xs font-semibold text-wine dark:text-[#C49DA4] shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5" />
                {toastMessage}
              </span>
            </div>
          )}

          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone bg-white/70 dark:bg-[#231B20]/60 py-20 text-center shadow-sm">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-wine/10 text-wine">
                <Layers className="h-6 w-6" strokeWidth={2} />
              </div>
              <p className="text-base font-semibold text-charcoal">
                No groups match &ldquo;{search}&rdquo;
              </p>
              <p className="mt-1 text-[13px] text-muted">
                Create a new group or clear your search query to see all available groups.
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-wine px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-wine-hover active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone/80 dark:border-[#3B2C34]',
                    'glass-surface bg-white/90 dark:bg-[#231B20]/90 p-5 sm:p-6 shadow-sm',
                    'transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-md hover:border-wine/30',
                  )}
                >
                  <div>
                    {/* Top Row: Monogram + Counts */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-sm text-white shadow-xs transition-transform duration-150 group-hover:scale-105"
                          style={{ backgroundColor: group.visualTheme.primary }}
                        >
                          {group.monogram}
                        </div>
                        <div>
                          <h2 className="text-base font-bold tracking-tight text-charcoal sm:text-lg">
                            {group.name}
                          </h2>
                          <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="h-3 w-3" />
                              {group.memberCount} members
                            </span>
                            <span>&middot;</span>
                            <span className="text-emerald-700 font-medium">
                              {group.onlineCount} online
                            </span>
                          </p>
                        </div>
                      </div>

                      {group.isCustom && (
                        <span className="rounded-full bg-wine/10 dark:bg-wine/25 px-2.5 py-0.5 text-[10.5px] font-bold text-wine dark:text-[#C49DA4]">
                          Custom
                        </span>
                      )}
                    </div>

                    {/* Topic Pill */}
                    <div className="mt-3.5 rounded-xl border border-stone-subtle dark:border-[#3B2C34]/60 bg-porcelain/60 dark:bg-wine/5 px-3 py-1.5 text-xs text-charcoal">
                      <span className="text-muted text-[11px] font-semibold mr-1.5">Topic:</span>
                      {group.topic}
                    </div>

                    {/* Description */}
                    <p className="mt-3 text-[13px] leading-relaxed text-muted line-clamp-2">
                      {group.description}
                    </p>
                  </div>

                  {/* Card Footer: Action */}
                  <div className="mt-5 pt-4 border-t border-stone-subtle dark:border-[#3B2C34]/60 flex items-center justify-between">
                    <span className="text-xs text-muted-faint font-medium">
                      {group.sampleMessages.length} messages
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveGroup(group)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-wine px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 ease-out hover:bg-wine-hover active:scale-95"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Open Discussion</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Group Preview / Chat Modal */}
      <GroupPreviewModal
        group={activeGroup}
        isOpen={activeGroup !== null}
        onClose={() => setActiveGroup(null)}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

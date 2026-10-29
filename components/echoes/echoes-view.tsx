'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  Search,
  Lock,
  ArrowRight,
  Pencil,
  Trash2,
  Sparkles,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { UserAvatar } from '@/components/user/user-avatar';
import { EchoNoteModal } from './echo-note-modal';
import type { NexusEchoItem } from '@/types/echoes';
import { cn } from '@/lib/utils/cn';

interface EchoesViewProps {
  initialEchoes?: NexusEchoItem[];
  currentUserId?: string;
}

export function EchoesView({ initialEchoes = [], currentUserId }: EchoesViewProps) {
  const router = useRouter();
  const [echoes, setEchoes] = useState<NexusEchoItem[]>(initialEchoes);
  const [loading, setLoading] = useState(initialEchoes.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with-notes'>('all');
  const [editingEcho, setEditingEcho] = useState<NexusEchoItem | null>(null);

  const loadEchoes = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/echoes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.echoes)) {
          setEchoes(data.echoes);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Unable to load echoes at this time.');
      }
    } catch (err) {
      console.error('Failed to load echoes:', err);
      setError('Network connection error. Please verify your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load echoes if not provided initially
  useEffect(() => {
    loadEchoes();
  }, [loadEchoes]);

  const handleUpdateNote = async (newNote: string) => {
    if (!editingEcho) return;
    try {
      const res = await fetch(`/api/echoes/${editingEcho.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        setEchoes((prev) =>
          prev.map((e) =>
            e.id === editingEcho.id
              ? { ...e, note: newNote || null, updatedAt: new Date().toISOString() }
              : e
          )
        );
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const handleUnsave = async () => {
    if (!editingEcho) return;
    try {
      const res = await fetch(`/api/echoes/${editingEcho.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEchoes((prev) => prev.filter((e) => e.id !== editingEcho.id));
      }
    } catch (err) {
      console.error('Failed to unsave echo:', err);
    }
  };

  const filteredEchoes = useMemo(() => {
    let result = echoes;

    if (filterType === 'with-notes') {
      result = result.filter((e) => Boolean(e.note && e.note.trim().length > 0));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const contentMatch = e.message?.content?.toLowerCase().includes(q);
        const noteMatch = e.note?.toLowerCase().includes(q);
        const authorMatch =
          e.message?.sender.name.toLowerCase().includes(q) ||
          e.message?.sender.username.toLowerCase().includes(q);
        const convMatch = e.message?.conversation.name?.toLowerCase().includes(q);
        return contentMatch || noteMatch || authorMatch || convMatch;
      });
    }

    return result;
  }, [echoes, filterType, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-porcelain dark:bg-[#1C1619] text-charcoal dark:text-foreground">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-stone/80 dark:border-[#382C34] bg-white/70 dark:bg-[#20181D]/80 backdrop-blur-md px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
                <Bookmark className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground">
                Nexus Echoes
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
              Personal bookmarks, memorable conversation moments, and private reflections.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold tracking-widest text-muted dark:text-muted-foreground uppercase">
              POWERED BY AASIF
            </span>
          </div>
        </div>

        {/* ── Controls: Search & Filters ────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search echoes, notes, authors..."
              className="w-full rounded-xl border border-stone dark:border-[#3B2C34] bg-white dark:bg-[#251D22] pl-9 pr-4 py-2 text-xs text-charcoal dark:text-foreground placeholder:text-muted focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-charcoal"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                filterType === 'all'
                  ? 'bg-wine text-white shadow-2xs'
                  : 'bg-white dark:bg-[#251D22] border border-stone dark:border-[#3B2C34] text-muted hover:text-charcoal dark:hover:text-foreground'
              )}
            >
              All Echoes ({echoes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('with-notes')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                filterType === 'with-notes'
                  ? 'bg-wine text-white shadow-2xs'
                  : 'bg-white dark:bg-[#251D22] border border-stone dark:border-[#3B2C34] text-muted hover:text-charcoal dark:hover:text-foreground'
              )}
            >
              <Lock className="h-3 w-3" />
              With Notes ({echoes.filter((e) => Boolean(e.note)).length})
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Echoes Content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-6 pb-28 md:pb-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl border border-stone/60 dark:border-[#382C34]/60 bg-white/50 dark:bg-[#221A1F]/50 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mb-4">
                <AlertCircle className="h-8 w-8" strokeWidth={1.8} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-charcoal dark:text-foreground">
                Unable to load echoes
              </h2>
              <p className="mt-2 max-w-md text-xs text-muted dark:text-muted-foreground leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={loadEchoes}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : filteredEchoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] mb-4">
                <Bookmark className="h-8 w-8" strokeWidth={1.8} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-charcoal dark:text-foreground">
                {searchQuery ? 'No matching echoes found' : 'No Echoes Saved Yet'}
              </h2>
              <p className="mt-2 max-w-md text-xs text-muted dark:text-muted-foreground leading-relaxed">
                {searchQuery
                  ? 'Try searching with different keywords or clearing your active filters.'
                  : 'Hover over any message in your conversations and click the bookmark icon to save moments with personal, private notes.'}
              </p>
              <Link
                href="/conversations"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all"
              >
                Go to Conversations <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEchoes.map((echo) => {
                const isDeleted = Boolean(echo.message?.deletedAt);
                const conversationHref = echo.message?.conversationId
                  ? `/conversations/${echo.message.conversationId}?messageId=${echo.messageId}`
                  : '/conversations';

                return (
                  <article
                    key={echo.id}
                    className="liquid-glass-card flex flex-col justify-between rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div>
                      {/* Author & Conversation Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            display_name={echo.message?.sender.name || 'Nexus Member'}
                            avatar_url={echo.message?.sender.avatarUrl || null}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-charcoal dark:text-foreground truncate">
                              {echo.message?.sender.name || 'Member'}
                            </span>
                            <span className="block text-[11px] text-muted truncate">
                              @{echo.message?.sender.username || 'user'}
                            </span>
                          </div>
                        </div>

                        <span className="shrink-0 text-[10.5px] tabular-nums text-muted bg-stone-subtle dark:bg-stone/10 rounded-full px-2 py-0.5 font-medium">
                          {new Date(echo.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Quoted Message Bubble */}
                      <div
                        className={cn(
                          'rounded-xl border p-3 text-xs leading-relaxed',
                          isDeleted
                            ? 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 text-muted'
                            : 'border-stone-subtle dark:border-[#33252E] bg-porcelain/60 dark:bg-[#2A2027]/60 text-charcoal dark:text-stone'
                        )}
                      >
                        {isDeleted ? (
                          <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>This message was deleted by its sender in conversation.</span>
                          </div>
                        ) : (
                          <p className="line-clamp-4 italic">
                            &ldquo;{echo.message?.content}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Private Personal Note Card */}
                      {echo.note ? (
                        <div className="mt-3 rounded-xl border border-wine/20 dark:border-wine/30 bg-wine/5 dark:bg-wine/15 p-3">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-wine dark:text-[#F3B3C2] mb-1">
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Private Note
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingEcho(echo)}
                              className="text-muted hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
                              title="Edit personal note"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-xs text-charcoal dark:text-foreground whitespace-pre-wrap break-words">
                            {echo.note}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingEcho(echo)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone dark:border-[#3B2C34] py-2 text-[11px] font-medium text-muted hover:text-wine hover:border-wine/40 dark:hover:text-[#F3B3C2] transition-colors"
                        >
                          <Lock className="h-3 w-3" />
                          + Add private personal note
                        </button>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-stone-subtle dark:border-[#382C34]/60 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted truncate max-w-[150px]">
                        {echo.message?.conversation.name || (echo.message?.conversation.type === 'direct' ? 'Direct Message' : 'Group')}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingEcho(echo)}
                          className="p-1.5 rounded-lg text-muted hover:text-charcoal hover:bg-stone/30 dark:hover:bg-wine/15 transition-colors"
                          title="Edit echo or note"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push(conversationHref)}
                          className="flex items-center gap-1 rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] hover:bg-wine hover:text-white dark:hover:bg-wine dark:hover:text-white px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                          title="Jump to original conversation"
                        >
                          View in Chat
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Edit Note Modal ──────────────────────────────────────────────────── */}
      {editingEcho && (
        <EchoNoteModal
          isOpen={Boolean(editingEcho)}
          message={
            editingEcho.message
              ? {
                  id: editingEcho.message.id,
                  content: editingEcho.message.content,
                  senderName: editingEcho.message.sender.name,
                  createdAt: editingEcho.message.createdAt,
                }
              : {
                  id: editingEcho.messageId,
                  content: 'Saved conversation moment',
                }
          }
          existingNote={editingEcho.note}
          isEchoed={true}
          onSave={handleUpdateNote}
          onUnsave={handleUnsave}
          onClose={() => setEditingEcho(null)}
        />
      )}
    </div>
  );
}

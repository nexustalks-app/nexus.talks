'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import { ConversationList } from './conversation-list';
import {
  ConversationNavigationProvider,
  useConversationNavigation,
} from './conversation-navigation-context';
import ConversationLoading from '@/app/(main)/conversations/[conversationId]/loading';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, X } from 'lucide-react';

interface ConversationsShellProps {
  currentUserId: string;
  children: React.ReactNode;
}

function ConversationsShellInner({
  currentUserId,
  children,
}: ConversationsShellProps) {
  const segment = useSelectedLayoutSegment();
  const { navigatingId, navigationError, retryNavigation, clearNavigationError } =
    useConversationNavigation();

  // In chat if a segment is committed OR a user-initiated navigation is in-flight
  const inChat = segment !== null || navigatingId !== null;

  return (
    <div className="relative flex h-full min-h-0 bg-transparent">
      {/* ── Navigation Timeout / Error Recovery Banner ─────────────────────── */}
      {navigationError && (
        <aside
          role="alert"
          aria-live="polite"
          className="absolute top-3 left-4 right-4 z-50 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg transition-all animate-in fade-in slide-in-from-top-2 bg-[#542C38] text-white border border-[#6A3947]/40"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="truncate">{navigationError.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={retryNavigation}
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={clearNavigationError}
              aria-label="Dismiss error notification"
              className="p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* ── Conversation List Sidebar ───────────────────────────────────── */}
      <section
        aria-label="Conversations"
        className={cn(
          'min-h-0 h-full overflow-hidden shrink-0 flex-col transition-[display] duration-150',
          'w-full md:w-[320px] lg:w-[360px] xl:w-[380px]',
          'nx-glass-column',
          inChat ? 'hidden md:flex' : 'flex',
        )}
      >
        <ConversationList currentUserId={currentUserId} />
      </section>

      {/* ── Active Conversation Center Pane ─────────────────────────────── */}
      <div
        className={cn(
          'min-h-0 h-full overflow-hidden min-w-0 flex-1 flex-col nx-fade-in',
          inChat ? 'flex' : 'hidden md:flex',
        )}
      >
        {navigatingId !== null && segment === null ? (
          <ConversationLoading />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function ConversationsShell(props: ConversationsShellProps) {
  return (
    <ConversationNavigationProvider>
      <ConversationsShellInner {...props} />
    </ConversationNavigationProvider>
  );
}

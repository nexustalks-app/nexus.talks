'use client';

import { useState, useEffect } from 'react';
import { ConversationHeader } from './conversation-header';
import { MessageList } from './message-list';
import { ConversationInfoCenter } from './conversation-info-center';
import { createClient } from '@/lib/supabase/client';
import {
  loadChatThemePreference,
  saveChatThemePreference,
  removeChatThemePreference,
  getChatThemeStyles,
  DEFAULT_THEME_PREFERENCE,
  type ConversationThemePreference,
} from '@/lib/theme/chat-theme';
import { useSettings } from '@/lib/settings/settings-context';
import type { MessageWithReactions } from './message-item';

const LS_KEY = 'nx.details';

interface Participant {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: 'online' | 'away' | 'offline';
  bio: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

interface ConversationMetadata {
  id: string;
  type?: 'direct' | 'group';
  createdAt?: string | null;
  name?: string | null;
}

interface ConversationViewProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageWithReactions[];
  participant: Participant;
  conversation?: ConversationMetadata;
  isMuted?: boolean;
}

/**
 * Client-side conversation canvas shell:
 *   [ConversationHeader + MessageList] | [ConversationInfoCenter (xl+ desktop or mobile sheet)]
 *
 * Coordinated state:
 * - Details panel open/closed (persisted in localStorage for desktop, sheet on mobile)
 * - In-conversation search state (synchronized between header, canvas, and panel)
 * - Personal chat theme customization & live CSS variable injection
 * - Realtime messages stream synchronization
 * - Live notification mute toggle
 */
export function ConversationView({
  conversationId,
  currentUserId,
  initialMessages,
  participant,
  conversation,
  isMuted: initialIsMuted = false,
}: ConversationViewProps) {
  const { isDarkTheme } = useSettings();
  // Default to open on desktop (xl+); reconcile with localStorage after first paint.
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [messages, setMessages] = useState<MessageWithReactions[]>(initialMessages);
  const [isMuted, setIsMuted] = useState(initialIsMuted);

  // Per-conversation Personal Chat Theme
  const [themePref, setThemePref] = useState<ConversationThemePreference>(DEFAULT_THEME_PREFERENCE);

  // Synchronize messages if initialMessages prop updates
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored !== null) setDetailsOpen(stored === 'true');
    } catch {
      // localStorage unavailable — stay with default
    }
  }, []);

  // Load chat theme preference from storage for this specific conversation
  useEffect(() => {
    setThemePref(loadChatThemePreference(conversationId, currentUserId));
  }, [conversationId, currentUserId]);

  const handleApplyTheme = (newPref: ConversationThemePreference) => {
    setThemePref(newPref);
    saveChatThemePreference(conversationId, newPref, currentUserId);
  };

  const handleResetTheme = () => {
    setThemePref(DEFAULT_THEME_PREFERENCE);
    removeChatThemePreference(conversationId, currentUserId);
  };

  const handleToggleDetails = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
      setDetailsOpen((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(LS_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } else {
      setMobileDetailsOpen((prev) => !prev);
    }
  };

  const handleToggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      const supabase = createClient();
      await supabase
        .from('conversation_members')
        .update({ is_muted: nextMuted })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId);
    } catch {
      // Rollback on error
      setIsMuted(!nextMuted);
    }
  };

  const chatThemeStyles = getChatThemeStyles(themePref, isDarkTheme);

  return (
    <div
      className="flex h-full min-h-0 overflow-hidden bg-[var(--pane-chat-bg,var(--background))]"
      style={chatThemeStyles}
    >
      {/* ── Center Conversation Column: Header + Messages Canvas + Composer ── */}
      <div className="nx-stage flex min-w-0 min-h-0 h-full flex-1 flex-col overflow-hidden">
        <ConversationHeader
          displayName={participant.displayName}
          avatarUrl={participant.avatarUrl}
          status={participant.status}
          username={participant.username}
          userId={participant.id}
          onToggleDetails={handleToggleDetails}
          detailsOpen={detailsOpen || mobileDetailsOpen}
          onToggleSearch={() => setSearchOpen((prev) => !prev)}
          searchOpen={searchOpen}
        />
        <MessageList
          key={conversationId}
          conversationId={conversationId}
          currentUserId={currentUserId}
          initialMessages={initialMessages}
          participantName={participant.displayName}
          participantAvatar={participant.avatarUrl}
          participantUsername={participant.username}
          conversationType={conversation?.type || 'direct'}
          onMessagesChange={setMessages}
          searchOpen={searchOpen}
          onCloseSearch={() => setSearchOpen(false)}
        />
      </div>

      {/* ── Right Details Panel: Only rendered on desktop (xl+ / ≥1280px) ───── */}
      {detailsOpen && (
        <div className="hidden xl:flex shrink-0 h-full min-h-0 overflow-hidden">
          <ConversationInfoCenter
            isOpen={true}
            onClose={handleToggleDetails}
            displayName={participant.displayName}
            username={participant.username}
            avatarUrl={participant.avatarUrl}
            status={participant.status}
            bio={participant.bio}
            lastSeenAt={participant.lastSeenAt}
            createdAt={participant.createdAt}
            userId={participant.id}
            conversationId={conversationId}
            conversationType={conversation?.type || 'direct'}
            conversationCreatedAt={conversation?.createdAt}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onToggleSearch={() => setSearchOpen((prev) => !prev)}
            searchOpen={searchOpen}
            messages={messages}
            themePreference={themePref}
            onApplyTheme={handleApplyTheme}
            onResetTheme={handleResetTheme}
            variant="panel"
          />
        </div>
      )}

      {/* ── Mobile/Tablet Slide-Over Sheet (< 1280px) ─────────────────────────── */}
      {mobileDetailsOpen && (
        <div className="xl:hidden">
          <ConversationInfoCenter
            isOpen={true}
            onClose={() => setMobileDetailsOpen(false)}
            displayName={participant.displayName}
            username={participant.username}
            avatarUrl={participant.avatarUrl}
            status={participant.status}
            bio={participant.bio}
            lastSeenAt={participant.lastSeenAt}
            createdAt={participant.createdAt}
            userId={participant.id}
            conversationId={conversationId}
            conversationType={conversation?.type || 'direct'}
            conversationCreatedAt={conversation?.createdAt}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onToggleSearch={() => setSearchOpen((prev) => !prev)}
            searchOpen={searchOpen}
            messages={messages}
            themePreference={themePref}
            onApplyTheme={handleApplyTheme}
            onResetTheme={handleResetTheme}
            variant="sheet"
          />
        </div>
      )}
    </div>
  );
}

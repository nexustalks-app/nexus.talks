'use client';

import {
  ConversationInfoCenter,
  type ConversationInfoCenterProps,
} from './conversation-info-center';
import {
  DEFAULT_THEME_PREFERENCE,
  type ConversationThemePreference,
} from '@/lib/theme/chat-theme';
import type { Message } from '@/types/database';

export interface ParticipantPanelProps {
  onClose: () => void;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: 'online' | 'away' | 'offline';
  bio?: string | null;
  lastSeenAt?: string | null;
  createdAt?: string | null;
  userId?: string;
  conversationId?: string;
  conversationType?: 'direct' | 'group';
  conversationCreatedAt?: string | null;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onToggleSearch?: () => void;
  searchOpen?: boolean;
  messages?: Message[];
  themePreference?: ConversationThemePreference;
  onApplyTheme?: (pref: ConversationThemePreference) => void;
  onResetTheme?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  variant?: 'panel' | 'sheet';
}

/**
 * ParticipantPanel — Unified wrapper that forwards to the ConversationInfoCenter
 * Nexus.talks Conversation Experience 2.0
 */
export function ParticipantPanel({
  onClose,
  displayName,
  username,
  avatarUrl,
  status,
  bio,
  lastSeenAt,
  createdAt,
  userId,
  conversationId,
  conversationType = 'direct',
  conversationCreatedAt,
  isMuted = false,
  onToggleMute,
  onToggleSearch,
  searchOpen = false,
  messages = [],
  themePreference = DEFAULT_THEME_PREFERENCE,
  onApplyTheme = () => {},
  onResetTheme = () => {},
  onJumpToMessage,
  variant = 'panel',
}: ParticipantPanelProps) {
  return (
    <ConversationInfoCenter
      isOpen={true}
      onClose={onClose}
      displayName={displayName}
      username={username}
      avatarUrl={avatarUrl}
      status={status}
      bio={bio}
      lastSeenAt={lastSeenAt}
      createdAt={createdAt}
      userId={userId}
      conversationId={conversationId}
      conversationType={conversationType}
      conversationCreatedAt={conversationCreatedAt}
      isMuted={isMuted}
      onToggleMute={onToggleMute}
      onToggleSearch={onToggleSearch}
      searchOpen={searchOpen}
      messages={messages}
      themePreference={themePreference}
      onApplyTheme={onApplyTheme}
      onResetTheme={onResetTheme}
      onJumpToMessage={onJumpToMessage}
      variant={variant}
    />
  );
}

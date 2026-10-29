import React from 'react';

export type CommandCategory =
  | 'context'
  | 'actions'
  | 'navigate'
  | 'conversations'
  | 'people'
  | 'messages'
  | 'preferences'
  | 'demo';

export interface CommandContext {
  pathname: string;
  isDemo: boolean;
  isAuthenticated: boolean;
  activeConversationId?: string | null;
  activeConversationName?: string | null;
}

export interface NexusCommand {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  keywords?: string[];
  icon?: React.ComponentType<{ className?: string }>;
  avatarUrl?: string | null;
  initials?: string;
  badge?: string;
  badgeVariant?: 'default' | 'wine' | 'emerald' | 'amber';
  shortcut?: string[];
  disabled?: boolean;
  disabledReason?: string;
  action: () => void | Promise<void>;
  isVisible?: (ctx: CommandContext) => boolean;
}

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  commands: NexusCommand[];
}

export interface CommandSearchState {
  query: string;
  isSearching: boolean;
  error: string | null;
}

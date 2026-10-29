export interface PulseConversationSummary {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatarUrl: string | null;
  unreadCount: number;
  lastMessageSnippet: string | null;
  lastMessageAt: string | null;
  lastSenderName: string | null;
  isMuted: boolean;
}

export interface PulseActivityItem {
  id: string;
  conversationId: string;
  conversationName: string;
  senderName: string;
  senderAvatar: string | null;
  actionSnippet: string;
  timestamp: string;
  isUnread: boolean;
}

export interface PulseData {
  totalUnreadCount: number;
  activeConversationsCount: number;
  recentConversations: PulseConversationSummary[];
  recentActivity: PulseActivityItem[];
}

/**
 * Database type definitions for Aasif Messenger
 * These types match the database schema defined in migrations
 */

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  status: 'online' | 'away' | 'offline';
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  canonical_pair?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMember = {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
  unread_count: number;
  is_muted: boolean;
  joined_at: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type Attachment = {
  id: string;
  message_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  thumbnail_url: string | null;
  created_at: string;
};

export type BlockedUser = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_message_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

// ── Nexus Guide types (spec §5.6) ─────────────────────────────────────────

export type SystemAccount = {
  kind:       string;          // CHECK kind IN ('nexus_guide')
  user_id:    string;
  enabled:    boolean;
  created_at: string;
};

export type GuideConversation = {
  user_id:         string;
  conversation_id: string;
  created_at:      string;
};

export type GuideReply = {
  user_message_id:  string;
  user_id:          string;
  conversation_id:  string;
  status:           'processing' | 'completed' | 'failed' | 'skipped';
  attempts:         number;
  reply_message_id: string | null;
  error_code:       string | null;
  created_at:       string;
  updated_at:       string;
};

// ── Nexus Echoes types (Phase 15) ─────────────────────────────────────────

export type Echo = {
  id: string;
  user_id: string;
  message_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

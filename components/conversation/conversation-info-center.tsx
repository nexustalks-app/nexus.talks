'use client';

import { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Search,
  User as UserIcon,
  Bell,
  BellOff,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Link2,
  MessageSquare,
  PanelRight,
  Palette,
  Image as ImageIcon,
  FileText,
  Pin,
  Download,
  Eye,
  Info,
} from 'lucide-react';
import { UserAvatar } from '@/components/user/user-avatar';
import { isCreatorIdentity } from '@/components/user/nexus-avatar-3d';
import { StatusPill } from '@/components/user/status-pill';
import { ProfileModal } from '@/components/profile/profile-modal';
import { ChatThemePickerModal } from './chat-theme-picker-modal';
import {
  type ConversationThemePreference,
  BUILT_IN_CHAT_THEMES,
} from '@/lib/theme/chat-theme';
import { formatMemberSince, formatLastSeen } from '@/lib/utils/profile-format';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/types/database';

export type InfoCenterTab = 'overview' | 'media' | 'files' | 'links' | 'pinned';

export interface SharedMediaItem {
  id: string;
  messageId: string;
  url: string;
  type: 'image' | 'video';
  date: string;
  senderName?: string;
}

export interface SharedFileItem {
  id: string;
  messageId: string;
  fileName: string;
  fileSize?: string;
  url?: string;
  mimeType?: string;
  date: string;
}

export interface SharedLinkItem {
  id: string;
  messageId: string;
  url: string;
  domain: string;
  date: string;
}

export interface ConversationInfoCenterProps {
  isOpen: boolean;
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
  onOpenProfile?: () => void;
  searchOpen?: boolean;
  messages?: Message[];
  themePreference: ConversationThemePreference;
  onApplyTheme: (pref: ConversationThemePreference) => void;
  onResetTheme: () => void;
  onJumpToMessage?: (messageId: string) => void;
  variant?: 'panel' | 'sheet';
}

function extractMediaFromMessages(messages: Message[]): SharedMediaItem[] {
  const mediaItems: SharedMediaItem[] = [];
  const imageRegex = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i;
  const videoRegex = /\.(mp4|webm|mov|ogg)($|\?)/i;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.deleted_at || msg.content === 'This message was deleted') continue;

    const dateStr = new Date(msg.created_at).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
    });

    if (msg.type === 'image' || (msg.content.startsWith('http') && imageRegex.test(msg.content)) || msg.content.startsWith('/demo/')) {
      mediaItems.push({
        id: `media-${msg.id}`,
        messageId: msg.id,
        url: msg.content,
        type: 'image',
        date: dateStr,
      });
    } else if ((msg.type as string) === 'video' || (msg.content.startsWith('http') && videoRegex.test(msg.content))) {
      mediaItems.push({
        id: `media-${msg.id}`,
        messageId: msg.id,
        url: msg.content,
        type: 'video',
        date: dateStr,
      });
    }
  }
  return mediaItems;
}

function extractFilesFromMessages(messages: Message[]): SharedFileItem[] {
  const fileItems: SharedFileItem[] = [];
  const fileExtRegex = /\.(pdf|docx?|xlsx?|pptx?|zip|tar|gz|txt|csv)($|\?)/i;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.deleted_at || msg.content === 'This message was deleted') continue;

    if (msg.type === 'file' || fileExtRegex.test(msg.content)) {
      const parts = msg.content.split('/');
      const rawName = parts[parts.length - 1] || 'Document';
      const cleanName = rawName.split('?')[0];

      fileItems.push({
        id: `file-${msg.id}`,
        messageId: msg.id,
        fileName: cleanName,
        url: msg.content.startsWith('http') ? msg.content : undefined,
        date: new Date(msg.created_at).toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
        }),
      });
    }
  }
  return fileItems;
}

function extractLinksFromMessages(messages: Message[]): SharedLinkItem[] {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const results: SharedLinkItem[] = [];
  const seen = new Set<string>();

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.deleted_at || msg.content === 'This message was deleted') continue;

    const matches = msg.content.match(urlRegex);
    if (matches) {
      for (const rawUrl of matches) {
        const cleanUrl = rawUrl.replace(/[.,!?;:)]+$/, '');
        // Exclude direct image links so they stay in Media tab
        if (/\.(jpeg|jpg|gif|png|webp|svg)$/i.test(cleanUrl)) continue;

        if (!seen.has(cleanUrl)) {
          seen.add(cleanUrl);
          let domain = cleanUrl;
          try {
            const parsed = new URL(cleanUrl);
            domain = parsed.hostname.replace(/^www\./, '');
          } catch {
            domain = cleanUrl.slice(0, 24);
          }

          results.push({
            id: `link-${msg.id}-${results.length}`,
            messageId: msg.id,
            url: cleanUrl,
            domain,
            date: new Date(msg.created_at).toLocaleDateString('en', {
              month: 'short',
              day: 'numeric',
            }),
          });
        }
      }
    }
  }
  return results;
}

export function ConversationInfoCenter({
  isOpen,
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
  onOpenProfile,
  searchOpen = false,
  messages = [],
  themePreference,
  onApplyTheme,
  onResetTheme,
  onJumpToMessage,
  variant = 'panel',
}: ConversationInfoCenterProps) {
  const [activeTab, setActiveTab] = useState<InfoCenterTab>('overview');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [copiedUsername, setCopiedUsername] = useState(false);

  const memberSince = formatMemberSince(createdAt);
  const lastSeen = status !== 'online' ? formatLastSeen(lastSeenAt) : null;
  const trimmedBio = bio?.trim() ?? '';

  const convStartedDate = useMemo(() => {
    if (!conversationCreatedAt) return null;
    return new Date(conversationCreatedAt).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [conversationCreatedAt]);

  const sharedMedia = useMemo(() => extractMediaFromMessages(messages), [messages]);
  const sharedFiles = useMemo(() => extractFilesFromMessages(messages), [messages]);
  const sharedLinks = useMemo(() => extractLinksFromMessages(messages), [messages]);

  const activeThemeMeta = BUILT_IN_CHAT_THEMES[themePreference.themeId] || BUILT_IN_CHAT_THEMES.default;

  const handleCopyUsername = () => {
    if (!username) return;
    try {
      navigator.clipboard.writeText(`@${username}`);
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-[#181116] text-charcoal dark:text-[#EDE8EC] select-none">
      {/* ── Header Bar ──────────────────────────────────────────────────────── */}
      <div className="flex h-[76px] md:h-[68px] shrink-0 items-center justify-between px-5 border-b border-stone/80 dark:border-white/10 bg-white/80 dark:bg-[#181116]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <PanelRight className="h-4 w-4 text-wine dark:text-[#E2A6B3]" />
          <h3 className="text-sm font-semibold tracking-tight">Conversation Info</h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversation info"
          title="Close details (Esc)"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-charcoal dark:hover:text-foreground hover:bg-stone/30 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* ── Segmented Navigation Tabs ───────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-stone/80 dark:border-white/10 bg-porcelain/50 dark:bg-[#140F13]/60">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label="Info center sections">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'media', label: `Media (${sharedMedia.length})`, icon: ImageIcon },
            { id: 'files', label: `Files (${sharedFiles.length})`, icon: FileText },
            { id: 'links', label: `Links (${sharedLinks.length})`, icon: Link2 },
            { id: 'pinned', label: 'Saved', icon: Pin },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as InfoCenterTab)}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150',
                  isCurrent
                    ? 'bg-white dark:bg-[#251A22] text-wine dark:text-[#F3B3C2] shadow-2xs border border-stone-subtle dark:border-white/10 font-semibold'
                    : 'text-muted-faint dark:text-[#8E868C] hover:text-charcoal dark:hover:text-[#EDE8EC] hover:bg-white/40 dark:hover:bg-white/5'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Scrollable Tab Panels ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
        {/* ── 1. OVERVIEW TAB ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 nx-fade-in">
            {/* Identity Banner */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className="relative shrink-0">
                <UserAvatar
                  id={username || userId}
                  display_name={displayName}
                  avatar_url={avatarUrl}
                  size="xl"
                  showCreatorBadge={isCreatorIdentity(userId) || isCreatorIdentity(displayName) || isCreatorIdentity(username)}
                  className="!h-20 !w-20 shadow-sm"
                />
              </div>

              <h4 className="mt-3.5 text-base sm:text-[17px] font-semibold text-charcoal dark:text-[#EDE8EC] tracking-tight">
                {displayName}
              </h4>
              <p className="mt-0.5 text-xs font-mono text-muted dark:text-[#9A9498]">
                @{username}
              </p>

              <div className="mt-2">
                <StatusPill status={status} />
              </div>

              {/* Bio */}
              {trimmedBio ? (
                <div className="mt-3.5 w-full rounded-2xl border border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] p-3.5 text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-faint dark:text-[#8E868C] block mb-1">
                    About
                  </span>
                  <p className="text-xs leading-relaxed text-charcoal/90 dark:text-[#DDD7DC] whitespace-pre-line">
                    {trimmedBio}
                  </p>
                </div>
              ) : null}

              {/* Timestamps */}
              {(memberSince || lastSeen) && (
                <div className="mt-3 w-full space-y-1.5 text-xs border-t border-stone-subtle dark:border-white/5 pt-3 text-left">
                  {memberSince && (
                    <div className="flex items-center justify-between text-muted dark:text-[#9A9498]">
                      <span className="flex items-center gap-1.5 text-muted-faint dark:text-[#8E868C]">
                        <Calendar className="h-3.5 w-3.5" /> Member since
                      </span>
                      <span className="font-medium text-charcoal dark:text-[#EDE8EC]">{memberSince}</span>
                    </div>
                  )}
                  {lastSeen && (
                    <div className="flex items-center justify-between text-muted dark:text-[#9A9498]">
                      <span className="flex items-center gap-1.5 text-muted-faint dark:text-[#8E868C]">
                        <Clock className="h-3.5 w-3.5" /> Last active
                      </span>
                      <span className="font-medium text-charcoal dark:text-[#EDE8EC]">{lastSeen}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Feature A Highlight: Personal Chat Theme Card */}
            <div className="rounded-2xl border border-wine/25 dark:border-wine/30 bg-gradient-to-br from-wine/[0.04] via-porcelain/60 to-transparent dark:from-wine/15 dark:via-[#1A1418] dark:to-[#181116] p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-wine dark:text-[#E2A6B3]" />
                  <span className="text-xs font-semibold text-charcoal dark:text-[#EDE8EC]">
                    Personal Chat Theme
                  </span>
                </div>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] font-semibold">
                  {activeThemeMeta.name}
                </span>
              </div>
              <p className="text-[11.5px] text-muted dark:text-[#9A9498] leading-relaxed">
                {activeThemeMeta.description}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-wine/15 dark:border-white/5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border border-black/15 dark:border-white/20 shadow-2xs"
                    style={{
                      background: `linear-gradient(135deg, ${activeThemeMeta.swatch.primary} 0%, ${activeThemeMeta.swatch.secondary} 100%)`,
                    }}
                  />
                  <span className="text-[11px] text-muted-faint dark:text-[#8E868C]">
                    {themePreference.themeId === 'default' ? 'Default palette' : 'Customized'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setThemePickerOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-medium shadow-2xs transition-all active:scale-95"
                >
                  <Palette className="h-3 w-3" />
                  <span>Change Theme</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-faint dark:text-[#8E868C] block px-0.5">
                Actions
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleSearch}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-all duration-150 active:scale-95',
                    searchOpen
                      ? 'border-wine/30 bg-wine/10 text-wine dark:text-[#F3B3C2] dark:bg-wine/25 shadow-xs'
                      : 'border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] text-charcoal dark:text-[#EDE8EC] hover:bg-porcelain dark:hover:bg-white/5'
                  )}
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-wine dark:text-[#E2A6B3]" />
                  <span className="truncate">Search chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenProfile) {
                      onOpenProfile();
                    } else {
                      setProfileModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl border border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] p-2.5 text-left text-xs font-medium text-charcoal dark:text-[#EDE8EC] hover:bg-porcelain dark:hover:bg-white/5 transition-all duration-150 active:scale-95"
                >
                  <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="truncate">Full profile</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleMute}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-all duration-150 active:scale-95',
                    isMuted
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] text-charcoal dark:text-[#EDE8EC] hover:bg-porcelain dark:hover:bg-white/5'
                  )}
                >
                  {isMuted ? (
                    <BellOff className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Bell className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                  <span className="truncate">{isMuted ? 'Muted' : 'Mute alerts'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="flex items-center gap-2 rounded-xl border border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] p-2.5 text-left text-xs font-medium text-charcoal dark:text-[#EDE8EC] hover:bg-porcelain dark:hover:bg-white/5 transition-all duration-150 active:scale-95"
                >
                  {copiedUsername ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                  <span className="truncate">{copiedUsername ? 'Copied!' : 'Copy user'}</span>
                </button>
              </div>
            </div>

            {/* Conversation Metadata Box */}
            <div className="rounded-2xl border border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-muted dark:text-[#9A9498]">
                <span className="flex items-center gap-1.5 text-muted-faint dark:text-[#8E868C]">
                  <MessageSquare className="h-3.5 w-3.5" /> Type
                </span>
                <span className="font-medium text-charcoal dark:text-[#EDE8EC]">
                  {conversationType === 'group' ? 'Group Circle' : 'Direct Conversation'}
                </span>
              </div>

              {convStartedDate && (
                <div className="flex items-center justify-between text-muted dark:text-[#9A9498]">
                  <span className="flex items-center gap-1.5 text-muted-faint dark:text-[#8E868C]">
                    <Calendar className="h-3.5 w-3.5" /> Created
                  </span>
                  <span className="font-medium text-charcoal dark:text-[#EDE8EC]">
                    {convStartedDate}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted dark:text-[#9A9498]">
                <span className="flex items-center gap-1.5 text-muted-faint dark:text-[#8E868C]">
                  <Clock className="h-3.5 w-3.5" /> Messages
                </span>
                <span className="font-medium text-charcoal dark:text-[#EDE8EC] tabular-nums">
                  {messages.length} loaded
                </span>
              </div>

              <div className="flex items-center justify-between text-muted dark:text-[#9A9498] pt-1 border-t border-stone-subtle dark:border-white/5">
                <span className="flex items-center gap-1.5 text-muted-faint dark:text-[#8E868C]">
                  <ShieldCheck className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" /> Privacy
                </span>
                <span className="text-[11.5px] font-medium text-wine dark:text-[#F3B3C2]">
                  Row-level secure
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. SHARED MEDIA TAB ────────────────────────────────────────────── */}
        {activeTab === 'media' && (
          <div className="space-y-4 nx-fade-in">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal dark:text-[#EDE8EC]">
                Shared Media
              </span>
              <span className="text-xs tabular-nums text-muted dark:text-[#9A9498]">
                {sharedMedia.length} {sharedMedia.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {sharedMedia.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {sharedMedia.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-2xl border border-stone/80 dark:border-white/10 overflow-hidden bg-porcelain/60 dark:bg-[#1A1418] cursor-pointer hover:shadow-md transition-all duration-150"
                    onClick={() => setPreviewMediaUrl(item.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt="Shared media preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                      <Eye className="h-4 w-4" />
                    </div>
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-black/60 text-white/90 backdrop-blur-xs">
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone/80 dark:border-white/10 bg-porcelain/40 dark:bg-[#1A1418]/40 py-10 px-4 text-center">
                <ImageIcon className="h-6 w-6 text-muted-faint dark:text-[#7A6A74] mb-2" />
                <p className="text-xs font-medium text-charcoal dark:text-[#EDE8EC]">
                  No media shared yet
                </p>
                <p className="text-[11px] text-muted dark:text-[#8E868C] mt-0.5 max-w-[200px]">
                  Photos and video clips sent in this chat will appear here for quick access.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 3. SHARED FILES TAB ────────────────────────────────────────────── */}
        {activeTab === 'files' && (
          <div className="space-y-4 nx-fade-in">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal dark:text-[#EDE8EC]">
                Shared Documents &amp; Files
              </span>
              <span className="text-xs tabular-nums text-muted dark:text-[#9A9498]">
                {sharedFiles.length}
              </span>
            </div>

            {sharedFiles.length > 0 ? (
              <div className="space-y-2">
                {sharedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] hover:border-wine/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-charcoal dark:text-[#EDE8EC]">
                          {file.fileName}
                        </p>
                        <p className="text-[10.5px] text-muted-faint dark:text-[#8E868C]">
                          {file.date}
                        </p>
                      </div>
                    </div>

                    {file.url ? (
                      <a
                        href={file.url}
                        download={file.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 text-muted transition-colors"
                        title="Download file"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone/80 dark:border-white/10 bg-porcelain/40 dark:bg-[#1A1418]/40 py-10 px-4 text-center">
                <FileText className="h-6 w-6 text-muted-faint dark:text-[#7A6A74] mb-2" />
                <p className="text-xs font-medium text-charcoal dark:text-[#EDE8EC]">
                  No files shared yet
                </p>
                <p className="text-[11px] text-muted dark:text-[#8E868C] mt-0.5 max-w-[200px]">
                  PDFs, presentations, and documents shared in this conversation will be listed here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 4. SHARED LINKS TAB ────────────────────────────────────────────── */}
        {activeTab === 'links' && (
          <div className="space-y-4 nx-fade-in">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal dark:text-[#EDE8EC]">
                Shared Links
              </span>
              <span className="text-xs tabular-nums text-muted dark:text-[#9A9498]">
                {sharedLinks.length}
              </span>
            </div>

            {sharedLinks.length > 0 ? (
              <div className="space-y-2">
                {sharedLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 p-3 rounded-2xl border border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] hover:border-wine/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone/40 dark:bg-white/10 text-muted group-hover:text-wine dark:group-hover:text-[#F3B3C2] group-hover:bg-wine/10 transition-colors">
                        <Link2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-charcoal dark:text-[#EDE8EC] group-hover:text-wine dark:group-hover:text-[#F3B3C2] transition-colors">
                          {link.domain}
                        </p>
                        <p className="truncate text-[11px] text-muted-faint dark:text-[#8E868C]">
                          {link.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-faint group-hover:text-wine shrink-0">
                      <span className="text-[10px] tabular-nums">{link.date}</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone/80 dark:border-white/10 bg-porcelain/40 dark:bg-[#1A1418]/40 py-10 px-4 text-center">
                <Link2 className="h-6 w-6 text-muted-faint dark:text-[#7A6A74] mb-2" />
                <p className="text-xs font-medium text-charcoal dark:text-[#EDE8EC]">
                  No links shared yet
                </p>
                <p className="text-[11px] text-muted dark:text-[#8E868C] mt-0.5 max-w-[200px]">
                  Web addresses and links posted in this conversation will be cataloged here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 5. PINNED & SAVED MOMENTS TAB ──────────────────────────────────── */}
        {activeTab === 'pinned' && (
          <div className="space-y-4 nx-fade-in">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal dark:text-[#EDE8EC]">
                Saved Moments &amp; Pinned
              </span>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone/80 dark:border-white/10 bg-porcelain/40 dark:bg-[#1A1418]/40 py-10 px-4 text-center">
              <Pin className="h-6 w-6 text-muted-faint dark:text-[#7A6A74] mb-2" />
              <p className="text-xs font-medium text-charcoal dark:text-[#EDE8EC]">
                No moments saved yet
              </p>
              <p className="text-[11px] text-muted dark:text-[#8E868C] mt-0.5 max-w-[220px]">
                Hover over any message in the chat and click the bookmark or echo action to save key reflections here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals & Dialogs ─────────────────────────────────────────────────── */}
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userId={userId}
        username={username}
        liveStatus={status}
        fallback={{ display_name: displayName, username, avatar_url: avatarUrl, status }}
      />

      <ChatThemePickerModal
        isOpen={themePickerOpen}
        onClose={() => setThemePickerOpen(false)}
        currentPreference={themePreference}
        onApplyTheme={onApplyTheme}
        onResetTheme={onResetTheme}
        participantName={displayName}
      />

      {/* Fullscreen Media Lightbox Preview */}
      {previewMediaUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md nx-backdrop-in"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewMediaUrl(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close media preview"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewMediaUrl}
            alt="Full size media preview"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl nx-dialog-enter"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );

  // If panel variant, render as docked aside container for desktop
  if (variant === 'panel') {
    return (
      <aside
        aria-label="Conversation details"
        className="flex h-full min-h-0 overflow-hidden shrink-0 flex-col border-l border-stone/80 dark:border-white/10 w-[320px] 2xl:w-[350px]"
      >
        {content}
      </aside>
    );
  }

  // If sheet variant, render as a mobile/tablet responsive slide-over modal drawer
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 dark:bg-black/70 backdrop-blur-xs nx-backdrop-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md h-full bg-white dark:bg-[#181116] shadow-2xl overflow-hidden nx-drawer-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}

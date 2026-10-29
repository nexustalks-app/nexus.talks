'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/user/user-avatar';
import { PresenceIndicator } from '@/components/user/presence-indicator';
import { ProfileModal } from '@/components/profile/profile-modal';
import { CallModal, type CallType } from '@/components/call/call-modal';
import { ChevronLeft, Phone, Video, PanelRight, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface ConversationHeaderProps {
  displayName: string;
  avatarUrl: string | null;
  status: 'online' | 'away' | 'offline';
  username: string;
  userId?: string;
  subtitle?: string;
  onToggleDetails?: () => void;
  detailsOpen?: boolean;
  onToggleSearch?: () => void;
  searchOpen?: boolean;
}

export function ConversationHeader({
  displayName,
  avatarUrl,
  status,
  username,
  userId,
  subtitle,
  onToggleDetails,
  detailsOpen,
  onToggleSearch,
  searchOpen,
}: ConversationHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);

  const handleProfileClick = () => {
    if (onToggleDetails) {
      onToggleDetails();
    } else {
      setProfileOpen(true);
    }
  };

  const statusLabel =
    status === 'online' ? 'Active now'
    : status === 'away' ? 'Away'
    : 'Offline';

  const displaySubtitle = subtitle || (status === 'online' ? 'Active now' : `@${username}`);

  return (
    <>
      <header
        className="relative z-20 flex h-[76px] md:h-[68px] shrink-0 items-center justify-between border-b px-4 sm:px-6 select-none transition-colors backdrop-blur-2xl bg-white/75 dark:bg-[#181116]/80 border-black/[0.06] dark:border-white/[0.08] shadow-xs"
      >
      {/* ── Left Edge: Back Navigation Button (mobile only) ────────────────── */}
      <div className="flex md:hidden items-center gap-2 z-10">
        <Link
          href="/conversations"
          className="flex md:hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground)] dark:text-[#e0dce3] transition-all duration-150 active:scale-95 shadow-xs"
          aria-label="Back to messages"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>

      {/* ── Desktop Left / Identity: Horizontal Avatar + Name/Status ────────── */}
      <div className="hidden md:flex items-center gap-3 z-10 min-w-0">
        <button
          type="button"
          onClick={handleProfileClick}
          aria-haspopup="dialog"
          aria-expanded={detailsOpen !== undefined ? detailsOpen : undefined}
          className="group flex items-center gap-3 py-1 px-1.5 -ml-1.5 rounded-2xl transition-transform active:scale-[0.98] text-left"
        >
          <div className="relative shrink-0">
            <UserAvatar
              id={username || userId}
              display_name={displayName}
              avatar_url={avatarUrl}
              size="sm"
              className="!h-10 !w-10 ring-1.5 ring-black/10 dark:ring-white/15 shadow-sm rounded-full"
            />
            <PresenceIndicator
              status={status}
              className="absolute -bottom-0.5 -right-0.5 !h-2.5 !w-2.5 ring-2 ring-[var(--chat-header-bg)]"
            />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="truncate text-[14px] sm:text-[15px] font-semibold tracking-tight text-[var(--foreground)] dark:text-white leading-tight">
              {displayName}
            </h2>
            <p className="mt-0.5 truncate text-[11.5px] font-normal text-[var(--foreground-muted)] dark:text-[#8e8a92] leading-tight">
              {displaySubtitle}
            </p>
          </div>
        </button>
      </div>

      {/* ── Mobile Screen Center: Centered DP, Name & Subtitle on exact central axis ─ */}
      <div className="absolute inset-0 flex md:hidden items-center justify-center pointer-events-none">
        <button
          type="button"
          onClick={handleProfileClick}
          aria-haspopup="dialog"
          aria-expanded={detailsOpen !== undefined ? detailsOpen : undefined}
          className="group flex flex-col items-center justify-center text-center pointer-events-auto py-1 px-3 rounded-2xl transition-transform active:scale-[0.98]"
        >
          {/* Centered Circular DP */}
          <div className="relative mb-1">
            <UserAvatar
              id={username || userId}
              display_name={displayName}
              avatar_url={avatarUrl}
              size="sm"
              className="!h-9 !w-9 sm:!h-10 sm:!w-10 ring-1.5 ring-black/10 dark:ring-white/15 shadow-sm rounded-full"
            />
            <PresenceIndicator
              status={status}
              className="absolute -bottom-0.5 -right-0.5 !h-2.5 !w-2.5 ring-2 ring-[var(--chat-header-bg)]"
            />
          </div>

          {/* Centered Contact Name */}
          <div className="flex items-center justify-center gap-1.5 max-w-[200px] sm:max-w-xs">
            <h2 className="truncate text-[14px] sm:text-[15px] font-semibold tracking-tight text-[var(--foreground)] dark:text-white leading-tight">
              {displayName}
            </h2>
          </div>

          {/* Centered Subtitle */}
          <p className="mt-0.5 truncate text-[11px] sm:text-[11.5px] font-normal text-[var(--foreground-muted)] dark:text-[#8e8a92] leading-tight max-w-[190px] sm:max-w-xs">
            {displaySubtitle}
          </p>
        </button>
      </div>

      {/* ── Right Edge: Call Controls ────────────────────────────────────── */}
      <div className="flex items-center gap-2 z-10">
        {/* Voice Call Button (matching reference) */}
        <button
          type="button"
          onClick={() => setCallType('voice')}
          title={`Voice call ${displayName}`}
          aria-label={`Voice call ${displayName}`}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:text-[#e0dce3] dark:hover:text-white transition-all duration-150 active:scale-95 shadow-xs"
        >
          <Phone className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Video Call Button */}
        <button
          type="button"
          onClick={() => setCallType('video')}
          title={`Video call ${displayName}`}
          aria-label={`Video call ${displayName}`}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:text-[#e0dce3] dark:hover:text-white transition-all duration-150 active:scale-95 shadow-xs"
        >
          <Video className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Details toggle button (compact circular info button beside phone & video) */}
        <button
          type="button"
          onClick={() => {
            if (onToggleDetails) {
              onToggleDetails();
            } else {
              setProfileOpen((prev) => !prev);
            }
          }}
          title={detailsOpen ? 'Hide conversation details' : 'Show conversation details'}
          aria-label={detailsOpen ? 'Hide conversation details' : 'Show conversation details'}
          aria-pressed={detailsOpen}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-150 ease-out active:scale-95 shadow-xs',
            detailsOpen
              ? 'border-wine/40 bg-wine/15 text-wine dark:bg-wine/25 dark:text-[#F3B3C2]'
              : 'border-black/[0.07] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.06] text-[var(--foreground-muted)] hover:text-wine dark:text-[#b5b0ba] hover:bg-wine/10 dark:hover:bg-wine/25 hover:border-wine/30 dark:hover:text-white',
          )}
        >
          <Info className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </header>

    <ProfileModal
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      userId={userId}
      username={username}
      liveStatus={status}
      fallback={{ display_name: displayName, username, avatar_url: avatarUrl, status }}
    />

    {/* Outgoing Call Interface (reconstructing Phone Layout 2) */}
    {callType && (
      <CallModal
        isOpen={Boolean(callType)}
        onClose={() => setCallType(null)}
        callType={callType}
        recipient={{
          name: displayName,
          username,
          avatarUrl,
          id: userId,
        }}
      />
    )}
  </>
);
}

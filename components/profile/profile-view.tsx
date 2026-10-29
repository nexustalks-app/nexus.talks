'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pencil, Calendar, Clock, Copy, Check, Camera } from 'lucide-react';
import type { Profile } from '@/types/database';
import { UserAvatar } from '@/components/user/user-avatar';
import { AvatarPickerModal } from '@/components/user/avatar-picker-modal';
import { isCreatorIdentity } from '@/components/user/nexus-avatar-3d';
import { StatusPill } from '@/components/user/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMemberSince, formatLastSeen } from '@/lib/utils/profile-format';

export type ProfileViewData = Pick<
  Profile,
  'display_name' | 'username' | 'avatar_url' | 'status'
> &
  Partial<Pick<Profile, 'bio' | 'last_seen_at' | 'created_at' | 'id'>>;

interface ProfileViewProps {
  profile: ProfileViewData;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onAvatarUpdated?: (newUrl: string | null) => void;
  variant?: 'page' | 'modal';
  titleId?: string;
  detailsLoading?: boolean;
}

export function ProfileView({
  profile,
  isOwnProfile = false,
  onEdit,
  onAvatarUpdated,
  variant = 'page',
  titleId,
  detailsLoading = false,
}: ProfileViewProps) {
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile.avatar_url]);

  const Heading = variant === 'page' ? 'h1' : 'h2';
  const { display_name, username, status, bio, created_at, last_seen_at, id: userId } = profile;

  const memberSince = formatMemberSince(created_at);
  const lastSeen = status !== 'online' ? formatLastSeen(last_seen_at) : null;
  const trimmedBio = bio?.trim() ?? '';
  const showAbout = detailsLoading || bio !== undefined;
  const showDetails = Boolean(memberSince || lastSeen);

  const handleCopyHandle = () => {
    if (!username) return;
    try {
      navigator.clipboard?.writeText(`@${username}`);
      setCopiedHandle(true);
      setTimeout(() => setCopiedHandle(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative select-none p-6 sm:p-8">
      {/* Identity Masthead */}
      <div className="flex flex-col items-center text-center justify-start shrink-0 pt-2">
        <div className="relative shrink-0">
          {isOwnProfile ? (
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine rounded-full transition-transform active:scale-95"
              aria-label="Change profile picture"
              title="Change Profile Picture"
            >
              <UserAvatar
                id={username || display_name}
                display_name={display_name}
                avatar_url={avatarUrl}
                size="2xl"
                showCreatorBadge={isCreatorIdentity(display_name) || isCreatorIdentity(username)}
                className="!h-24 !w-24 shadow-md group-hover:opacity-90 transition-opacity"
              />
              <span
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-wine text-white shadow-md border-2 border-white dark:border-[#20181D] group-hover:scale-110 transition-transform"
              >
                <Camera className="h-3.5 w-3.5 stroke-[2.2]" />
              </span>
            </button>
          ) : (
            <UserAvatar
              id={username || display_name}
              display_name={display_name}
              avatar_url={avatarUrl}
              size="2xl"
              showCreatorBadge={isCreatorIdentity(display_name) || isCreatorIdentity(username)}
              className="!h-24 !w-24 shadow-md"
            />
          )}
        </div>

        <Heading
          id={titleId}
          className="mt-4 max-w-full font-bold text-2xl tracking-tight text-charcoal dark:text-foreground sm:text-3xl [overflow-wrap:anywhere]"
        >
          {display_name}
        </Heading>

        {/* Copyable Handle */}
        <button
          type="button"
          onClick={handleCopyHandle}
          title="Click to copy handle"
          aria-label={`Copy @${username} handle`}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium text-muted dark:text-muted-foreground hover:bg-stone/40 dark:hover:bg-[#342730] hover:text-charcoal dark:hover:text-foreground transition-all duration-150 active:scale-95"
        >
          <span>@{username}</span>
          {copiedHandle ? (
            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3 text-muted-faint" />
          )}
        </button>

        <div className="mt-3">
          <StatusPill status={status} />
        </div>
      </div>

      {/* Profile Info Cards */}
      <div className="mt-7 space-y-3.5">
        {/* About section */}
        {showAbout && (
          <div className="liquid-glass-card rounded-2xl px-4 py-3.5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground mb-2">
              About
            </h3>
            {detailsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            ) : trimmedBio ? (
              <p className="text-[13.5px] sm:text-[14px] leading-relaxed text-charcoal dark:text-foreground whitespace-pre-line [overflow-wrap:anywhere]">
                {trimmedBio}
              </p>
            ) : (
              <p className="text-[12.5px] italic text-muted dark:text-muted-foreground">No bio provided yet.</p>
            )}
          </div>
        )}

        {/* Account Details */}
        {showDetails && (
          <div className="liquid-glass-card rounded-2xl px-4 py-3.5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground mb-2.5">
              Account Details
            </h3>
            <div className="space-y-2 text-[13px]">
              {memberSince && (
                <div className="flex items-center justify-between text-muted dark:text-muted-foreground">
                  <span className="flex items-center gap-2 text-muted-faint dark:text-[#887882]">
                    <Calendar className="h-4 w-4" /> Joined
                  </span>
                  <span className="font-semibold text-charcoal dark:text-foreground">{memberSince}</span>
                </div>
              )}
              {lastSeen && (
                <div className="flex items-center justify-between text-muted dark:text-muted-foreground">
                  <span className="flex items-center gap-2 text-muted-faint dark:text-[#887882]">
                    <Clock className="h-4 w-4" /> Last seen
                  </span>
                  <span className="font-semibold text-charcoal dark:text-foreground">{lastSeen}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Button */}
      {isOwnProfile && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 border-t border-stone-subtle dark:border-[#33252E] pt-5">
          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-wine/30 dark:border-wine/40 bg-wine/10 dark:bg-wine/20 px-4 py-2.5 text-[13px] font-semibold text-wine dark:text-[#F3B3C2] shadow-2xs transition-all hover:bg-wine hover:text-white active:scale-95"
          >
            <Camera className="h-3.5 w-3.5 stroke-[2.2]" />
            <span>Change Avatar</span>
          </button>

          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-wine px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-wine-hover active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-wine px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-wine-hover active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Profile in Settings</span>
            </Link>
          )}
        </div>
      )}

      {/* Subtle Understated Creator Signature */}
      <div className="mt-8 text-center">
        <span className="text-[9.5px] font-mono tracking-widest uppercase text-muted-faint/80 dark:text-[#7A6A74]/80">
          POWERED BY AASIF
        </span>
      </div>

      {/* Avatar Picker Modal */}
      {isOwnProfile && (
        <AvatarPickerModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatarUrl={avatarUrl}
          userId={userId}
          displayName={display_name}
          username={username}
          onSuccess={(newUrl) => {
            setAvatarUrl(newUrl);
            if (onAvatarUpdated) onAvatarUpdated(newUrl);
          }}
        />
      )}
    </div>
  );
}

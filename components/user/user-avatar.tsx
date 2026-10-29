'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { NexusAvatar3D, type AvatarSize, isCreatorIdentity, AVATAR_SIZE_CLASSES } from './nexus-avatar-3d';

export interface UserAvatarProps {
  display_name: string;
  avatar_url?: string | null;
  size?: AvatarSize;
  className?: string;
  id?: string;
  showCreatorBadge?: boolean;
  isPinned?: boolean;
}

export function UserAvatar({
  display_name,
  avatar_url,
  size = 'md',
  className,
  id,
  showCreatorBadge = false,
  isPinned = false,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const isCreator = isCreatorIdentity(id) || isCreatorIdentity(display_name);

  // Preserve existing user-uploaded or profile images strictly; fallback to NexusAvatar3D on 404/network error
  if (avatar_url && !imageError) {
    return (
      <div className={cn('relative inline-flex shrink-0 select-none rounded-full', AVATAR_SIZE_CLASSES[size] || AVATAR_SIZE_CLASSES.md, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar_url}
          alt={display_name}
          onError={() => setImageError(true)}
          className={cn(
            'h-full w-full rounded-full object-cover ring-1 ring-black/[0.06] dark:ring-white/[0.12] shadow-2xs'
          )}
        />
        {isCreator && showCreatorBadge && (
          <span
            title="Creator of Nexus.talks"
            aria-label="Creator"
            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-b from-[#7A1F35] to-[#3A0E18] text-[#FFE8A3] border-[1.2px] border-[#E5B869] shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
          >
            <svg viewBox="0 0 10 10" className="h-2 w-2 fill-current">
              <polygon points="5,0.8 6.3,3.7 9.2,5 6.3,6.3 5,9.2 3.7,6.3 0.8,5 3.7,3.7" />
            </svg>
          </span>
        )}
      </div>
    );
  }

  return (
    <NexusAvatar3D
      id={id || display_name}
      name={display_name}
      size={size}
      className={className}
      showCreatorBadge={showCreatorBadge}
      isPinned={isPinned}
    />
  );
}

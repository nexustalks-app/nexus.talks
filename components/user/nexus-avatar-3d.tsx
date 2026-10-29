'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  type AvatarSize,
  AVATAR_SIZE_CLASSES,
  type LuxuryPalette,
  LUXURY_PALETTES,
  isCreatorIdentity,
  getAvatarIndex,
  getAvatarPalette,
} from '@/lib/avatar/avatar-tokens';
import { getInitials } from '@/lib/avatar/initials';

// Re-export for 100% backward compatibility across all existing callers
export {
  type AvatarSize,
  isCreatorIdentity,
  getAvatarIndex,
  getInitials,
  LUXURY_PALETTES,
  getAvatarPalette,
  AVATAR_SIZE_CLASSES,
};

export interface NexusAvatar3DProps {
  id?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
  avatarIndex?: number;
  showCreatorBadge?: boolean;
  isPinned?: boolean;
}

/**
 * Premium 3D Monogram Avatar Component.
 * Mature, executive typography on tactile luxury Wine & Porcelain medallions.
 *
 * Exact Centering & Baseline Preservation:
 * - viewBox: 0 0 80 80
 * - Center: x="40", y="40.5"
 * - Alignment: dominantBaseline="central", textAnchor="middle"
 * - Spacing: letterSpacing="1.5" (multi-letter) or "0" (single-letter)
 * - Typography: Playfair Display / Georgia (Creator), Plus Jakarta Sans (Others)
 */
export function NexusAvatar3D({
  id,
  name,
  size = 'md',
  className,
  avatarIndex,
  showCreatorBadge = false,
  isPinned = false,
}: NexusAvatar3DProps) {
  const reactId = useId().replace(/[:]/g, '');
  const isCreator = isCreatorIdentity(id) || isCreatorIdentity(name);
  const chosenIndex =
    typeof avatarIndex === 'number'
      ? (avatarIndex === 0 && !isCreator ? 1 : avatarIndex % LUXURY_PALETTES.length)
      : (isCreator ? 0 : getAvatarIndex(id || name));

  const palette = LUXURY_PALETTES[chosenIndex] || LUXURY_PALETTES[1];
  const initials = getInitials(name, id);
  const uid = `${reactId}_${chosenIndex}`;

  // Font sizing proportional to 80x80 SVG coordinate space
  const fontSize = initials.length > 1 ? '27' : '32';
  const textY = '40.5';

  return (
    <div
      data-nexus-avatar="true"
      data-avatar-index={chosenIndex}
      data-is-creator={isCreator ? 'true' : undefined}
      data-is-pinned={isPinned ? 'true' : undefined}
      aria-label={name || (isCreator ? 'Mr Aasif (Creator)' : `Profile initials ${initials}`)}
      role="img"
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center rounded-full overflow-hidden transition-transform duration-150',
        AVATAR_SIZE_CLASSES[size] || AVATAR_SIZE_CLASSES.md,
        (isCreator || isPinned)
          ? 'ring-1 ring-wine/30 dark:ring-wine/50 shadow-2xs'
          : 'ring-1 ring-black/[0.06] dark:ring-white/[0.12] shadow-2xs',
        className
      )}
    >
      <svg
        viewBox="0 0 80 80"
        className="h-full w-full object-cover"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Base luxury enamel gradient */}
          <linearGradient id={`grad_${uid}`} x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor={palette.gradient[0]} />
            <stop offset="100%" stopColor={palette.gradient[1]} />
          </linearGradient>

          {/* Curvature vignette (spherical dome shadow for physical depth) */}
          <radialGradient id={`vignette_${uid}`} cx="48%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </radialGradient>

          {/* Top glossy specular crest (creator exclusive) */}
          {isCreator && (
            <linearGradient id={`crest_${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          )}

          {/* Outer rim metallic / ceramic bevel (creator exclusive) */}
          {isCreator && (
            <linearGradient id={`rim_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="50%" stopColor={palette.rim} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
            </linearGradient>
          )}

          {/* Creator exclusive gold leaf gradient and celestial aura */}
          {isCreator && (
            <>
              <linearGradient id={`goldText_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFDF8" />
                <stop offset="40%" stopColor="#FFF2D6" />
                <stop offset="100%" stopColor="#E5B869" />
              </linearGradient>
              <radialGradient id={`creatorAura_${uid}`} cx="50%" cy="40%" r="55%">
                <stop offset="0%" stopColor="#E5B869" stopOpacity="0.42" />
                <stop offset="60%" stopColor="#8C2B45" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2D0B14" stopOpacity="0" />
              </radialGradient>
            </>
          )}
        </defs>

        {/* 1. Enamel Background Disk */}
        <circle cx="40" cy="40" r="40" fill={`url(#grad_${uid})`} />

        {/* 2. Creator Celestial Radiance */}
        {isCreator && (
          <circle cx="40" cy="40" r="39.5" fill={`url(#creatorAura_${uid})`} />
        )}

        {/* 3. Spherical 3D Vignette (Lens / Medallion Curvature) */}
        <circle cx="40" cy="40" r="39.5" fill={`url(#vignette_${uid})`} />

        {/* 4. Top Glass Dome Specular Crest (Creator exclusive) */}
        {isCreator && (
          <ellipse cx="40" cy="21" rx="34" ry="17" fill={`url(#crest_${uid})`} />
        )}

        {/* 5. Fine Concentric Luxury Coin Hairline Groove (Creator exclusive) */}
        {isCreator && (
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={palette.innerRing}
            strokeWidth="0.75"
          />
        )}

        {/* 6. Outer Beveled Rim Stroke (Creator exclusive) */}
        {isCreator && (
          <circle
            cx="40"
            cy="40"
            r="38.75"
            fill="none"
            stroke={`url(#rim_${uid})`}
            strokeWidth="1.25"
          />
        )}

        {/* 7. Embossed Monogram Typography (Exact Centering x=40, y=40.5) */}
        <text
          x="40"
          y={textY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isCreator ? `url(#goldText_${uid})` : palette.textColor}
          fontFamily={isCreator ? "ui-serif, 'Playfair Display', Georgia, serif" : "ui-sans-serif, system-ui, 'Plus Jakarta Sans', -apple-system, sans-serif"}
          fontSize={fontSize}
          fontWeight={isCreator ? "600" : "700"}
          letterSpacing={initials.length > 1 ? "1.5" : "0"}
          style={{
            filter: 'drop-shadow(0px 1.5px 2px rgba(0, 0, 0, 0.55)) drop-shadow(0px -0.5px 0.5px rgba(255, 255, 255, 0.30))',
          }}
        >
          {initials}
        </text>
      </svg>

      {/* Creator Seal Brooch Badge */}
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

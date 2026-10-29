import React from 'react';
import { cn } from '@/lib/utils/cn';

interface NexusMarkProps {
  size?: number;
  className?: string;
  variant?: 'icon' | 'constellation' | 'hero';
}

/**
 * Signature Nexus Design Motif:
 * A distinctive celestial-architectural connection mark uniting:
 * - The 4-point Nexus Star (focal point of communication)
 * - Fine orbital ring with satellite connection nodes
 * - Flanking connection rays in constellation mode
 */
export function NexusMark({
  size = 20,
  className,
  variant = 'icon',
}: NexusMarkProps) {
  if (variant === 'constellation') {
    return (
      <div
        className={cn('inline-flex items-center gap-2 select-none', className)}
        aria-hidden="true"
      >
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-wine/40 dark:to-[#E2A6B3]/40" />
        <span className="h-1 w-1 rounded-full bg-wine/50 dark:bg-[#E2A6B3]/60" />
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-wine dark:text-[#E2A6B3] shrink-0"
        >
          {/* Orbital Ring */}
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="0.85"
            strokeDasharray="2.5 3"
            opacity="0.6"
          />
          {/* Orbital Satellite Nodes */}
          <circle cx="20.5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="6" cy="18" r="0.9" fill="currentColor" opacity="0.8" />
          {/* Center Nexus Star */}
          <path
            d="M 12 5.5 L 13.2 10.8 L 18.5 12 L 13.2 13.2 L 12 18.5 L 10.8 13.2 L 5.5 12 L 10.8 10.8 Z"
            fill="currentColor"
          />
        </svg>
        <span className="h-1 w-1 rounded-full bg-wine/50 dark:bg-[#E2A6B3]/60" />
        <span className="h-px w-6 bg-gradient-to-l from-transparent to-wine/40 dark:to-[#E2A6B3]/40" />
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'relative inline-flex items-center justify-center select-none',
          className
        )}
        aria-hidden="true"
      >
        {/* Subtle breathing orbital aura */}
        <div className="absolute inset-0 rounded-full bg-wine/10 dark:bg-wine/25 blur-md animate-pulse" />
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative text-wine dark:text-[#F3B3C2]"
        >
          {/* Outer Orbital Path */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="3 4"
            opacity="0.45"
          />
          {/* Inner Orbital Path */}
          <circle
            cx="24"
            cy="24"
            r="14"
            stroke="currentColor"
            strokeWidth="0.9"
            opacity="0.3"
          />
          {/* Satellites */}
          <circle cx="44" cy="24" r="2" fill="currentColor" />
          <circle cx="10" cy="34" r="1.6" fill="currentColor" opacity="0.85" />
          <circle cx="34" cy="10" r="1.4" fill="currentColor" opacity="0.75" />
          {/* Center Nexus Star */}
          <path
            d="M 24 9 L 26.5 21.5 L 39 24 L 26.5 26.5 L 24 39 L 21.5 26.5 L 9 24 L 21.5 21.5 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-wine dark:text-[#E2A6B3] shrink-0', className)}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="0.85"
        strokeDasharray="2.5 3"
        opacity="0.55"
      />
      <circle cx="20.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="6" cy="18" r="0.9" fill="currentColor" opacity="0.8" />
      <path
        d="M 12 5.5 L 13.2 10.8 L 18.5 12 L 13.2 13.2 L 12 18.5 L 10.8 13.2 L 5.5 12 L 10.8 10.8 Z"
        fill="currentColor"
      />
    </svg>
  );
}

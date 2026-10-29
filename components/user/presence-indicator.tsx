import { cn } from '@/lib/utils/cn';
import type { CSSProperties } from 'react';

interface PresenceIndicatorProps {
  status: 'online' | 'away' | 'offline';
  className?: string;
  style?: CSSProperties;
}

export function PresenceIndicator({ status, className, style }: PresenceIndicatorProps) {
  const color =
    status === 'online' ? '#2E7D5B'
    : status === 'away' ? '#D97706'
    : '#A09A9E';

  return (
    <span
      title={status.charAt(0).toUpperCase() + status.slice(1)}
      aria-label={`Status: ${status}`}
      className={cn('inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#271E23]', className)}
      style={{ backgroundColor: color, ...style }}
    />
  );
}

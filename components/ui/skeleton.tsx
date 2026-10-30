import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-stone/50 dark:bg-white/[0.07]',
        'after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/60 dark:after:via-white/10 after:to-transparent after:animate-[nx-shimmer_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite]',
        'motion-reduce:after:hidden',
        className,
      )}
      {...props}
    />
  );
}

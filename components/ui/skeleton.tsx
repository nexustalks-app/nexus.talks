import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-stone/60',
        className,
      )}
      {...props}
    />
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="flex h-full w-full flex-col bg-porcelain dark:bg-[var(--background)] nx-fade-in overflow-y-auto">
      {/* ── Signature Glass Header Skeleton ─────────────────────────────── */}
      <div className="shrink-0 border-b border-stone/80 bg-white/85 dark:bg-[#1C1619]/85 backdrop-blur-md px-5 py-5 sm:px-10 sm:py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-xl bg-stone/70 dark:bg-white/10" />
            <Skeleton className="h-7 w-32 rounded-lg bg-stone/80 dark:bg-white/15" />
          </div>
          <Skeleton className="mt-2 h-4 w-72 rounded bg-stone/50 dark:bg-white/10" />

          {/* Settings Section Tabs Skeleton */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-xl bg-stone/50 dark:bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Settings Content Card Skeleton ──────────────────────────────── */}
      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-stone/70 dark:border-white/10 bg-white/80 dark:bg-[#20181D]/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full bg-stone/60 dark:bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded-lg bg-stone/70 dark:bg-white/15" />
                <Skeleton className="h-3.5 w-28 rounded bg-stone/50 dark:bg-white/10" />
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t border-stone/50 dark:border-white/5">
              <Skeleton className="h-10 w-full rounded-xl bg-stone/40 dark:bg-white/5" />
              <Skeleton className="h-10 w-full rounded-xl bg-stone/40 dark:bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

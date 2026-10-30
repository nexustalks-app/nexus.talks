import { Skeleton } from '@/components/ui/skeleton';

export default function MainSectionLoading() {
  return (
    <div className="flex h-full w-full flex-col bg-porcelain dark:bg-[var(--background)] nx-fade-in">
      {/* ── Signature Glass Header Skeleton ─────────────────────────────── */}
      <div className="shrink-0 border-b border-stone/60 dark:border-white/10 bg-white/70 dark:bg-[#1C1619]/70 px-5 py-5 sm:px-10 sm:py-6 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl bg-stone/70 dark:bg-white/10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-36 rounded-lg bg-stone/80 dark:bg-white/15" />
              <Skeleton className="h-3 w-56 rounded bg-stone/50 dark:bg-white/10" />
            </div>
          </div>
          <Skeleton className="hidden sm:block h-7 w-28 rounded-full bg-stone/40 dark:bg-white/10" />
        </div>
      </div>

      {/* ── Section Content Skeleton Grid ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Filter/Search bar skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 flex-1 rounded-xl bg-stone/50 dark:bg-white/10" />
            <Skeleton className="h-10 w-24 rounded-xl bg-stone/50 dark:bg-white/10" />
          </div>

          {/* Cards skeleton grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-2xl border border-stone/60 dark:border-white/10 bg-white/60 dark:bg-[#20181D]/60 p-4 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl bg-stone/60 dark:bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4 rounded bg-stone/70 dark:bg-white/15" />
                    <Skeleton className="h-3 w-1/2 rounded bg-stone/40 dark:bg-white/10" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full rounded-lg bg-stone/40 dark:bg-white/5" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-4 w-20 rounded bg-stone/40 dark:bg-white/10" />
                  <Skeleton className="h-8 w-20 rounded-xl bg-wine/15 dark:bg-wine/25" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

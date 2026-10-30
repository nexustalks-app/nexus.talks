import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-porcelain dark:bg-[var(--background)] nx-fade-in">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-start px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-16">
        <header className="mb-4 flex w-full items-center justify-between">
          <Skeleton className="h-8 w-28 rounded-xl bg-stone/70 dark:bg-white/10" />
        </header>

        <div className="w-full overflow-hidden rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] shadow-md">
          <div className="flex flex-col items-center px-6 pb-10 pt-12 sm:pt-16">
            <Skeleton className="h-24 w-24 rounded-full bg-stone/60 dark:bg-white/10" />
            <Skeleton className="mt-4 h-7 w-44 rounded-xl bg-stone/70 dark:bg-white/15" />
            <Skeleton className="mt-2 h-4 w-24 rounded-lg bg-stone/50 dark:bg-white/10" />
            <div className="mt-8 w-full space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl bg-stone/40 dark:bg-white/5" />
              <Skeleton className="h-24 w-full rounded-2xl bg-stone/40 dark:bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

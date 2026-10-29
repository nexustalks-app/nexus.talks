'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProfileView } from '@/components/profile/profile-view';
import { useCurrentProfile } from '@/components/profile/use-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, loading, error } = useCurrentProfile();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/settings');
    }
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-porcelain dark:bg-[var(--background)]">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-start px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-16">
        {/* Top Header with Back Control */}
        <header className="mb-4 flex w-full items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex items-center gap-2 rounded-xl border border-stone/80 dark:border-[#382832] bg-white/80 dark:bg-[#251D22]/80 px-3 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground shadow-2xs backdrop-blur-md transition-all hover:bg-stone/30 dark:hover:bg-[#2F242B] hover:text-wine dark:hover:text-[#F3B3C2] active:scale-95"
            aria-label="Back from My Profile"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.2} />
            <span>My Profile</span>
          </button>
        </header>

        <div className="w-full overflow-hidden rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] shadow-md">
          {loading ? (
            <div
              className="flex flex-col items-center px-6 pb-10 pt-12 sm:pt-16"
              aria-busy="true"
            >
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="mt-4 h-7 w-44 rounded-xl" />
              <Skeleton className="mt-2 h-4 w-24 rounded-lg" />
              <div className="mt-8 w-full space-y-4">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            </div>
          ) : profile ? (
            <ProfileView profile={profile} isOwnProfile variant="page" />
          ) : (
            <div className="px-6 py-16 text-center">
              <h1 className="text-lg font-bold text-charcoal">
                Unable to load profile
              </h1>
              <p className="mt-1 text-sm text-muted">
                {error ?? 'Please check your connection and retry.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

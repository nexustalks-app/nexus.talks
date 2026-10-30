'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProfileView } from '@/components/profile/profile-view';
import type { Profile } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface ProfilePageClientProps {
  initialProfile: Profile | null;
  user: User;
}

export function ProfilePageClient({ initialProfile, user: _user }: ProfilePageClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);

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
          {profile ? (
            <ProfileView
              profile={profile}
              isOwnProfile
              variant="page"
              onAvatarUpdated={(newUrl) => {
                setProfile((prev) => (prev ? { ...prev, avatar_url: newUrl } : null));
                router.refresh();
              }}
            />
          ) : (
            <div className="px-6 py-16 text-center">
              <h1 className="text-lg font-bold text-charcoal">
                Unable to load profile
              </h1>
              <p className="mt-1 text-sm text-muted">
                Please check your connection and retry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

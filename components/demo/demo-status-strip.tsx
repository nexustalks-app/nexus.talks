'use client';

import { Sparkles, Info } from 'lucide-react';
import { type DemoStatusProfile } from './demo-data';
import { UserAvatar } from '@/components/user/user-avatar';
import { cn } from '@/lib/utils/cn';

interface DemoStatusStripProps {
  profiles: DemoStatusProfile[];
  viewedProfileIds: Set<string>;
  onSelectProfile: (profileId: string) => void;
}

export function DemoStatusStrip({
  profiles,
  viewedProfileIds,
  onSelectProfile,
}: DemoStatusStripProps) {
  return (
    <section
      aria-label="Nexus Moments Demo Statuses"
      className="border-b border-stone-subtle/50 dark:border-white/[0.06] bg-porcelain/40 dark:bg-[#140F13]/60 px-3.5 py-3"
    >
      {/* Subtle Section Header */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-charcoal/70 dark:text-[#A69BA1] tracking-wider uppercase font-sans">
          <Sparkles className="h-3 w-3 text-wine dark:text-[#E2A6B3]" />
          <span>Nexus Moments</span>
        </div>

        <div
          title="Fictional demo stories created to showcase the Nexus.talks personality. 100% local."
          className="flex items-center gap-1 text-[10.5px] text-muted-faint dark:text-[#8E868C] hover:text-charcoal dark:hover:text-[#EDE8EC] transition-colors cursor-help"
        >
          <Info className="h-3 w-3" />
          <span className="hidden sm:inline">Demo Stories</span>
        </div>
      </div>

      {/* Horizontal Status Avatars Scroll Strip */}
      <div className="flex items-start gap-3 overflow-x-auto no-scrollbar py-1 px-0.5 focus:outline-none">
        {profiles.map((profile) => {
          const isViewed = viewedProfileIds.has(profile.id);

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelectProfile(profile.id)}
              className="group flex flex-col items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine/60 rounded-xl p-1 transition-transform active:scale-95"
              aria-label={`View ${profile.name}'s story`}
            >
              {/* Outer Ring */}
              <div
                className={cn(
                  'relative rounded-full transition-all duration-200',
                  !isViewed
                    ? 'p-[1.5px] bg-gradient-to-tr from-[#7A223B] via-[#943851] to-[#D48B9B] dark:from-[#B84564] dark:via-[#D16B85] dark:to-[#E8B8C4] group-hover:scale-105'
                    : 'p-[1px] bg-stone-strong/40 dark:bg-white/15 opacity-70 group-hover:opacity-100 group-hover:scale-105'
                )}
              >
                {/* Avatar Core - inner surface spacer wrapper */}
                <div className="relative flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full p-[1.5px] bg-white dark:bg-[#1A1418]">
                  <div className="relative h-full w-full rounded-full overflow-hidden">
                    <UserAvatar
                      id={profile.id}
                      display_name={profile.name}
                      avatar_url={profile.avatarUrl}
                      size="md"
                      className="!h-full !w-full"
                    />
                  </div>
                </div>

                {/* Online / Active Indicator Dot */}
                <span
                  className={cn(
                    'absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-[1.5px] border-white dark:border-[#1A1418] z-20 pointer-events-none',
                    profile.isCreator
                      ? 'bg-emerald-500'
                      : profile.isBrand
                      ? 'bg-wine dark:bg-[#D98293]'
                      : 'bg-emerald-500'
                  )}
                />
              </div>

              {/* Identity Name */}
              <div className="w-[72px] sm:w-[76px] text-center">
                <span
                  className={cn(
                    'text-[11px] leading-tight truncate block w-full transition-colors',
                    !isViewed
                      ? 'font-medium text-charcoal/90 dark:text-[#E8E2E6]'
                      : 'font-normal text-muted-faint dark:text-[#8E868C]'
                  )}
                >
                  {profile.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

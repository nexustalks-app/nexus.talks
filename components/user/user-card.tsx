'use client';

import Link from 'next/link';
import type { Profile } from '@/types/database';
import { UserAvatar } from './user-avatar';
import { PresenceIndicator } from './presence-indicator';
import { MessageSquare, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface UserCardProps {
  user: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url' | 'status' | 'bio'> & {
    is_self?: boolean;
  };
  onClick?: () => void;
  disabled?: boolean;
}

export function UserCard({ user, onClick, disabled }: UserCardProps) {
  const isSelf = Boolean(user.is_self);

  return (
    <div
      className={cn(
        'group flex flex-col justify-between rounded-3xl border border-stone/80 dark:border-[#3B2C34]',
        'glass-surface bg-white/90 dark:bg-[#20171D]/90 p-6 text-left transition-[border-color,box-shadow,transform] duration-200 ease-out shadow-sm',
        'hover:shadow-md hover:border-stone-strong dark:hover:border-[#4B3944]',
      )}
    >
      <div>
        {/* Top Identity Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <UserAvatar
                display_name={user.display_name}
                avatar_url={user.avatar_url}
                size="lg"
                className="!h-14 !w-14 !text-xl shadow-sm"
              />
              <PresenceIndicator
                status={user.status}
                className="absolute bottom-0.5 right-0.5 !h-3.5 !w-3.5 ring-2 ring-white dark:ring-[#20171D] z-10"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-bold text-charcoal dark:text-foreground leading-snug">
                  {user.display_name}
                </h3>
                {isSelf && (
                  <span className="shrink-0 rounded-full bg-wine/10 dark:bg-wine/25 px-2 py-0.5 text-[10.5px] font-bold text-wine dark:text-[#F3B3C2]">
                    You
                  </span>
                )}
              </div>
              <p className="text-[13px] font-medium text-wine dark:text-[#F7B6C4] mt-0.5">
                @{user.username}
              </p>
            </div>
          </div>

          {user.status === 'online' ? (
            <span className="shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Active now
            </span>
          ) : user.status === 'away' ? (
            <span className="shrink-0 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              Away
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-stone-subtle dark:bg-[#2C2128] border border-stone/80 dark:border-[#3B2C34] px-2.5 py-0.5 text-[11px] font-medium text-muted">
              Offline
            </span>
          )}
        </div>

        {/* Bio statement */}
        <div className="mt-4 rounded-2xl bg-porcelain/60 dark:bg-[#261C23] border border-stone-subtle dark:border-[#362731] p-3.5">
          {user.bio ? (
            <p className="line-clamp-3 text-[13px] leading-relaxed text-charcoal/90 dark:text-stone/90">
              {user.bio}
            </p>
          ) : (
            <p className="text-[12.5px] text-muted-faint italic">
              Active Nexus.talks member. No bio provided.
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-stone-subtle dark:border-[#362731] flex items-center justify-between">
        <span className="text-[11.5px] text-muted dark:text-muted-foreground">
          {isSelf ? 'Your verified handle' : 'Verified unique handle'}
        </span>

        {isSelf ? (
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone/80 dark:border-[#3B2C34] bg-porcelain dark:bg-[#2A2027] px-4 py-2 text-[12.5px] font-semibold text-charcoal dark:text-foreground transition-all duration-150 hover:bg-stone/50 hover:text-wine active:scale-95"
          >
            <User className="h-3.5 w-3.5" />
            <span>View Profile</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl bg-wine px-4 py-2 text-[13px] font-semibold text-white shadow-sm',
              'transition-all duration-150 hover:bg-wine-hover active:scale-95 border-t border-white/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {disabled ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Connecting…</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Message</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

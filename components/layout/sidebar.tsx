'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Compass,
  Globe,
  Layers,
  Plus,
  Command,
  Bookmark,
  Activity,
  Sun,
  Moon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { UserAvatar } from '@/components/user/user-avatar';
import { isCreatorIdentity } from '@/components/user/nexus-avatar-3d';
import { useSettings } from '@/lib/settings/settings-context';
import { useCommand } from '@/lib/command/command-context';
import { clearConversationListCache } from '@/components/conversation/conversation-list';
import { clearProfileCache } from '@/components/profile/use-profile';
import { CreateActionSheet } from './create-action-sheet';

interface SidebarProps {
  user: User;
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

const DESKTOP_NAV_ITEMS = [
  { name: 'Messages', href: '/conversations', icon: MessageSquare },
  { name: 'Pulse', href: '/pulse', icon: Activity },
  { name: 'Echoes', href: '/echoes', icon: Bookmark },
  { name: 'Communities', href: '/communities', icon: Globe },
  { name: 'Groups', href: '/groups', icon: Layers },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
] as const;

export function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDarkTheme, updateAppearance, setCurrentUserId } = useSettings();
  const { open: openCommand } = useCommand();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id, setCurrentUserId]);

  const handleLogout = async () => {
    clearConversationListCache();
    clearProfileCache();
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ status: 'offline', last_seen_at: new Date().toISOString() })
      .eq('id', user.id);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const displayName = profile?.display_name || user.email || 'User';
  const inChat = /^\/conversations\/[^/]+/.test(pathname);
  const profileIsActive = pathname.startsWith('/profile');

  // Mobile navigation tab states
  const isMessagesActive = pathname === '/' || pathname.startsWith('/conversations');
  const isCommunitiesActive = pathname.startsWith('/communities');
  const isGroupsActive = pathname.startsWith('/groups');
  const isSettingsActive = pathname.startsWith('/settings') || pathname.startsWith('/profile');

  return (
    <>
      {/* ── Desktop Floating Liquid Glass Dock ───────────────────────────── */}
      <aside
        aria-label="Desktop Navigation Dock"
        className="hidden md:flex shrink-0 h-full w-[76px] min-w-[76px] py-4 pl-3.5 pr-2 items-center justify-center select-none z-30"
      >
        <div className="liquid-glass-dock-desktop relative flex flex-col items-center my-auto w-[58px] rounded-[29px] p-1.5 py-3 gap-1 shadow-2xl">
          {/* Top Zone: Brand Monogram & Quick Actions */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            {/* Brand Monogram Jewel */}
            <Link
              href="/conversations"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#802B43] via-[#631D35] to-[#451222] text-white font-serif font-black text-[15px] shadow-md shadow-wine/40 border border-white/35 transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
              title="Nexus.talks — Home"
            >
              N
            </Link>

            {/* Quick Create Action — Restrained tint & subtle outline */}
            <button
              type="button"
              onClick={() => setCreateSheetOpen(true)}
              title="Start or discover (New chat, groups, communities)"
              aria-label="Start or discover"
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-wine/10 hover:bg-wine text-wine hover:text-white border border-wine/25 dark:bg-wine/20 dark:hover:bg-wine dark:text-[#F3B3C2] dark:hover:text-white dark:border-wine/35 shadow-xs transition-all duration-150 ease-out hover:scale-105 active:scale-95"
            >
              <Plus className="h-4.5 w-4.5 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.4} />
            </button>

            {/* Nexus Command Palette Launcher */}
            <button
              type="button"
              onClick={openCommand}
              title="Nexus Command (Ctrl+K or ⌘K)"
              aria-label="Nexus Command (Ctrl+K or ⌘K)"
              className="group flex h-8.5 w-8.5 items-center justify-center rounded-lg text-muted hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 dark:hover:text-[#F3B3C2] transition-all duration-150 ease-out active:scale-90"
            >
              <Command className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Hairline Separator */}
          <div className="w-7 h-px bg-[var(--chat-divider,#EBE3E0)] dark:bg-white/10 my-1.5 shrink-0" />
          <nav aria-label="Primary" className="flex flex-col items-center gap-1.5 w-full">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  title={item.name}
                  aria-label={item.name}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                    isActive
                      ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                      : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
                  )}
                >
                  <item.icon
                    className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105"
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Subtle horizontal divider above account utility section */}
          <div className="w-8 h-px bg-[var(--chat-divider,#EBE3E0)] dark:bg-white/10 my-1.5 shrink-0" role="separator" />

          {/* Bottom Zone: Profile Avatar & Sign Out */}
          <div className="flex flex-col items-center gap-1.5 w-full shrink-0">
            <Link
              href="/profile"
              prefetch={true}
              title="Your profile"
              aria-label="Your profile"
              aria-current={profileIsActive ? 'page' : undefined}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-150 ease-out hover:scale-105 active:scale-95',
                profileIsActive && 'ring-2 ring-wine dark:ring-[#F3B3C2] ring-offset-2 ring-offset-[var(--surface)]'
              )}
            >
              <UserAvatar
                id={profile?.username || user.id}
                display_name={displayName}
                avatar_url={profile?.avatar_url ?? null}
                size="sm"
                showCreatorBadge={isCreatorIdentity(displayName) || isCreatorIdentity(profile?.username)}
              />
              <span
                aria-hidden="true"
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-[#1C1619] bg-emerald-600"
              />
            </Link>

            {/* Theme Toggle in Navigation Dock */}
            <button
              type="button"
              onClick={() => updateAppearance({ theme: isDarkTheme ? 'light' : 'midnight-wine' })}
              title={isDarkTheme ? 'Switch to Porcelain theme' : 'Switch to Deep Wine theme'}
              aria-label={isDarkTheme ? 'Switch to Porcelain theme' : 'Switch to Deep Wine theme'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all duration-150 ease-out hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 dark:hover:text-[#F3B3C2] active:scale-90"
            >
              {isDarkTheme ? (
                <Sun className="h-3.5 w-3.5 text-[#F3B3C2]" strokeWidth={1.8} />
              ) : (
                <Moon className="h-3.5 w-3.5 text-wine" strokeWidth={1.8} />
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all duration-150 ease-out hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 dark:hover:text-[#F3B3C2] active:scale-90"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Floating Liquid Glass Pill Dock ───────────────────────── */}
      {/* Arrangement: Messages — Communities — [ + ] — Groups — Settings */}
      <nav
        aria-label="Primary"
        className={cn(
          'fixed z-40 md:hidden transition-all duration-200 ease-out',
          'bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-6 sm:right-6 max-w-md mx-auto',
          inChat && 'hidden pointer-events-none opacity-0 translate-y-4'
        )}
      >
        <div className="liquid-glass-dock relative flex items-center justify-between h-[62px] px-2.5 rounded-[32px] shadow-2xl">
          {/* 1. Messages */}
          <Link
            href="/conversations"
            prefetch={true}
            aria-current={isMessagesActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              isMessagesActive
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                isMessagesActive
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <MessageSquare
                className="h-4.5 w-4.5"
                strokeWidth={isMessagesActive ? 2.2 : 1.8}
              />
            </div>
            <span className={isMessagesActive ? 'font-semibold' : 'font-normal'}>Messages</span>
          </Link>

          {/* 2. Communities */}
          <Link
            href="/communities"
            prefetch={true}
            aria-current={isCommunitiesActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              isCommunitiesActive
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                isCommunitiesActive
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <Globe
                className="h-4.5 w-4.5"
                strokeWidth={isCommunitiesActive ? 2.2 : 1.8}
              />
            </div>
            <span className={isCommunitiesActive ? 'font-semibold' : 'font-normal'}>Communities</span>
          </Link>

          {/* 3. Raised Centred [ + ] Floating Action Button Jewel */}
          <div className="flex flex-col items-center justify-center px-1">
            <button
              type="button"
              onClick={() => setCreateSheetOpen(true)}
              aria-label="Start or discover (New chat, people, groups, communities)"
              className="liquid-glass-jewel relative -mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white ring-4 ring-porcelain dark:ring-[#231B20] transition-all duration-150 active:scale-90 hover:scale-105"
            >
              <Plus className="h-6 w-6 transition-transform duration-160 group-active:rotate-45" strokeWidth={2.4} />
              <span className="sr-only">Start or Discover</span>
            </button>
            <span className="text-[9.5px] font-medium text-muted mt-0.5 select-none">Create</span>
          </div>

          {/* 4. Groups */}
          <Link
            href="/groups"
            prefetch={true}
            aria-current={isGroupsActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              isGroupsActive
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                isGroupsActive
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <Layers
                className="h-4.5 w-4.5"
                strokeWidth={isGroupsActive ? 2.2 : 1.8}
              />
            </div>
            <span className={isGroupsActive ? 'font-semibold' : 'font-normal'}>Groups</span>
          </Link>

          {/* 5. Settings */}
          <Link
            href="/settings"
            prefetch={true}
            aria-current={isSettingsActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              isSettingsActive
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                isSettingsActive
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <Settings
                className="h-4.5 w-4.5"
                strokeWidth={isSettingsActive ? 2.2 : 1.8}
              />
            </div>
            <span className={isSettingsActive ? 'font-semibold' : 'font-normal'}>Settings</span>
          </Link>
        </div>
      </nav>

      {/* ── Start or Discover Action Sheet ───────────────────────────────── */}
      <CreateActionSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      />
    </>
  );
}

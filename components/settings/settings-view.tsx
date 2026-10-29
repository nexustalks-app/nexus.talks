'use client';

import React, { useState } from 'react';
import {
  Palette,
  MessageSquare,
  Eye,
  Bell,
  ShieldCheck,
  User,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import { AppearanceSection } from './sections/appearance-section';
import { ChatSection } from './sections/chat-section';
import { AccessibilitySection } from './sections/accessibility-section';
import { NotificationSection } from './sections/notification-section';
import { PrivacySection } from './sections/privacy-section';
import { AccountSection } from './sections/account-section';
import { cn } from '@/lib/utils/cn';

export type SettingsTabId =
  | 'appearance'
  | 'chat'
  | 'accessibility'
  | 'notifications'
  | 'privacy'
  | 'account';

interface SettingsViewProps {
  user: {
    id: string;
    email?: string;
    created_at?: string;
  };
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    bio?: string | null;
  } | null;
}

const TABS: { id: SettingsTabId; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    desc: 'Theme, text size, and chat bubble styles',
  },
  {
    id: 'chat',
    label: 'Chats',
    icon: MessageSquare,
    desc: 'Keyboard shortcuts and list previews',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: Eye,
    desc: 'Visual contrast, typography, and motion reduction',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    desc: 'Audio chimes and background desktop alerts',
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    icon: ShieldCheck,
    desc: 'Presence visibility and data management',
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    desc: 'Profile information and password security',
  },
];

export function SettingsView({ user, profile }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('appearance');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { resetToDefaults } = useSettings();

  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overscroll-contain bg-porcelain dark:bg-[var(--background)] pb-28 md:pb-8">
      {/* Settings Top Bar: Signature Glass */}
      <header className="glass-header sticky top-0 z-10 shrink-0 border-b border-stone/80 dark:border-[#382832] bg-white/85 dark:bg-[#1C1619]/85 px-5 py-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground sm:text-3xl">
              Settings
            </h1>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Configure your workspace appearance, behavior, and security.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {resetSuccess && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 animate-fade-in">
                <Check className="h-3.5 w-3.5" /> Defaults restored
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#251D22] px-3 py-1.5 text-xs font-medium text-charcoal dark:text-foreground transition-[background-color,color,border-color,transform] duration-150 ease-out hover:bg-stone/50 dark:hover:bg-[#2F242B] hover:text-wine dark:hover:text-[#F3B3C2] active:scale-95"
              title="Reset all settings to default values"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-8 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar (Desktop & Tablet) */}
          <nav
            aria-label="Settings Categories"
            className="md:col-span-4 lg:col-span-3 sticky top-24 space-y-1.5"
          >
            {/* Mobile Category Horizontal Scroller */}
            <div className="flex md:hidden overflow-x-auto gap-2 pb-2.5 no-scrollbar">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-95',
                      isActive
                        ? 'border-wine bg-wine text-white shadow-sm'
                        : 'border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] text-muted dark:text-muted-foreground hover:border-stone-strong dark:hover:border-[#4D3945] hover:text-charcoal dark:hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Category Vertical List */}
            <div className="hidden md:flex md:flex-col space-y-1 rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-2 shadow-sm">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
                      isActive
                        ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] font-semibold shadow-sm'
                        : 'text-muted dark:text-muted-foreground hover:bg-porcelain dark:hover:bg-[#281F25] hover:text-charcoal dark:hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-wine dark:bg-[#F3B3C2] transition-all duration-150"
                      />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-wine dark:text-[#F3B3C2]' : 'text-muted dark:text-muted-foreground group-hover:text-charcoal dark:group-hover:text-foreground'
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Active Category Content Panel */}
          <main key={activeTab} className="md:col-span-8 lg:col-span-9 min-h-[500px] animate-fade-in">
            {activeTab === 'appearance' && <AppearanceSection />}
            {activeTab === 'chat' && <ChatSection />}
            {activeTab === 'accessibility' && <AccessibilitySection />}
            {activeTab === 'notifications' && <NotificationSection />}
            {activeTab === 'privacy' && <PrivacySection userId={user.id} email={user.email} />}
            {activeTab === 'account' && <AccountSection user={user} profile={profile} />}
          </main>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-sm animate-backdrop-fade"
        >
          <div className="w-full max-w-sm rounded-2xl border border-stone bg-white p-6 shadow-xl animate-dialog-enter">
            <h2 id="reset-dialog-title" className="text-base font-bold text-charcoal">
              Reset All Preferences?
            </h2>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              This will restore all appearance, chat density, accessibility, and notification preferences to their system defaults. Your account profile information will not be modified.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-xl border border-stone bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:bg-porcelain active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl bg-wine px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-wine-hover active:scale-95"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

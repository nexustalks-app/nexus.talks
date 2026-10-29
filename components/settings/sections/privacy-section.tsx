'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UserCheck,
  Clock,
  LogOut,
  AlertOctagon,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface PrivacySectionProps {
  userId?: string;
  email?: string;
}

export function PrivacySection({ userId, email }: PrivacySectionProps) {
  const router = useRouter();
  const { settings, updatePrivacy } = useSettings();
  const { appearOffline, hideLastSeen } = settings.privacy;

  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleAppearOffline = async (val: boolean) => {
    updatePrivacy({ appearOffline: val });
    if (!userId) return;

    setSavingStatus(true);
    setStatusMessage(null);
    try {
      const supabase = createClient();
      const newStatus = val ? 'offline' : 'online';
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, last_seen_at: new Date().toISOString() })
        .eq('id', userId);

      if (!error) {
        setStatusMessage(val ? 'You now appear offline to other members.' : 'Your status is now online.');
      }
    } catch {
      // Offline or network error
    } finally {
      setSavingStatus(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleSignOut = async () => {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ status: 'offline', last_seen_at: new Date().toISOString() })
      .eq('id', userId);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleClearLocalSession = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      {/* Presence & Visibility */}
      <section aria-labelledby="presence-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 id="presence-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Presence & Activity Privacy
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Manage how your online availability is presented across Nexus.talks.
            </p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-stone-subtle dark:divide-[#382832]/60">
          {/* Appear Offline */}
          <div className="flex items-center justify-between py-4 first:pt-0">
            <div>
              <label htmlFor="appear-offline-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                Appear Offline
              </label>
              <p className="text-xs text-muted dark:text-muted-foreground">
                Updates your public status to offline. Contacts will see a grey offline badge rather than an emerald indicator.
              </p>
              {savingStatus && (
                <span className="mt-1 inline-block text-[11px] text-wine font-medium">
                  Updating database status…
                </span>
              )}
              {statusMessage && (
                <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {statusMessage}
                </span>
              )}
            </div>
            <Switch
              id="appear-offline-toggle"
              checked={appearOffline}
              onCheckedChange={handleToggleAppearOffline}
              aria-label="Appear offline"
            />
          </div>

          {/* Hide Last Seen */}
          <div className="flex items-center justify-between py-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="hide-lastseen-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Hide Last Seen Timestamp
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Suppresses the exact &quot;Last seen&quot; timestamp displayed on your public profile card.
                </p>
              </div>
            </div>
            <Switch
              id="hide-lastseen-toggle"
              checked={hideLastSeen}
              onCheckedChange={(val) => updatePrivacy({ hideLastSeen: val })}
              aria-label="Hide last seen timestamp"
            />
          </div>
        </div>
      </section>

      {/* Session Security Information */}
      <section aria-labelledby="security-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 id="security-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Session & Connection Security
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Security parameters for your active authenticated session.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-stone dark:border-[#382832] bg-porcelain/60 dark:bg-[#251D22]/60 p-3.5 text-xs">
            <span className="text-muted dark:text-muted-foreground flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-wine" /> Transport Encryption
            </span>
            <span className="font-semibold text-charcoal dark:text-foreground">TLS 1.3 / WSS Encrypted</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-stone dark:border-[#382832] bg-porcelain/60 dark:bg-[#251D22]/60 p-3.5 text-xs">
            <span className="text-muted dark:text-muted-foreground">Authentication Provider</span>
            <span className="font-semibold text-charcoal dark:text-foreground">Supabase Auth (JWT & HttpOnly Session)</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-stone dark:border-[#382832] bg-porcelain/60 dark:bg-[#251D22]/60 p-3.5 text-xs">
            <span className="text-muted dark:text-muted-foreground">Active User Account</span>
            <span className="font-semibold text-charcoal dark:text-foreground truncate max-w-[200px]">{email ?? 'Authenticated'}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-stone-subtle dark:border-[#382832]/60 pt-5">
          {showSignoutConfirm ? (
            <div className="rounded-xl border border-wine/30 dark:border-wine/40 bg-wine/5 dark:bg-wine/15 p-4">
              <p className="text-xs font-semibold text-charcoal dark:text-foreground">
                Are you sure you want to sign out of Nexus.talks?
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg bg-wine px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-wine-hover active:scale-95"
                >
                  Yes, Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignoutConfirm(false)}
                  className="rounded-lg border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-3.5 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground transition hover:bg-porcelain dark:hover:bg-[#2D2329] active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignoutConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-4 py-2 text-xs font-semibold text-charcoal dark:text-foreground shadow-sm transition-[background-color,color,transform] duration-150 ease-out hover:bg-porcelain dark:hover:bg-[#2D2329] hover:text-wine active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out of Current Session</span>
            </button>
          )}
        </div>
      </section>

      {/* Account Deletion / Data Clearance */}
      <section aria-labelledby="danger-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div>
            <h2 id="danger-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Account Deletion & Data Clearance
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground leading-relaxed">
              Permanent server-side user deletion requires database cascade permissions. You can clear local device caches and reset all stored preferences immediately.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-stone-subtle dark:border-[#382832]/60 bg-porcelain/40 dark:bg-[#251D22]/40 p-4">
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-xs text-charcoal dark:text-foreground font-medium leading-relaxed">
                This will clear all local message caches, custom preferences, and sign you out of this browser. To permanently delete your Supabase account and message history from the database, an administrator cascade request must be filed.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearLocalSession}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-rose-700 active:scale-95"
                >
                  Confirm Local Reset & Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-3.5 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground transition hover:bg-porcelain dark:hover:bg-[#2D2329] active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-muted dark:text-muted-foreground">
                Clear all local cached conversations, preferences, and session storage on this device.
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="shrink-0 rounded-xl border border-stone dark:border-rose-900/40 bg-white dark:bg-[#251D22] px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 shadow-sm transition-[background-color,border-color,color,transform] duration-150 ease-out hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 active:scale-95"
              >
                Clear Local Data & Sign Out
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

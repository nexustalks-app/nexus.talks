'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Volume2, ShieldAlert, Monitor, Check, AlertTriangle } from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import { Switch } from '@/components/ui/switch';
import { playNotificationSound } from '@/lib/utils/audio';
import { cn } from '@/lib/utils/cn';

export function NotificationSection() {
  const { settings, updateNotifications } = useSettings();
  const {
    inAppAlerts,
    soundEnabled,
    desktopNotifications,
    includePreviewInNotification,
  } = settings.notifications;

  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [testedSound, setTestedSound] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser environment.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      if (result === 'granted') {
        updateNotifications({ desktopNotifications: true });
        new Notification('Nexus.talks Notifications Enabled', {
          body: 'You will receive notifications for incoming messages when this tab is in the background.',
          icon: '/favicon.ico',
        });
      } else {
        updateNotifications({ desktopNotifications: false });
      }
    } catch {
      // Permission request blocked or failed
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    setTestedSound(true);
    setTimeout(() => setTestedSound(false), 1200);
  };

  return (
    <div className="space-y-8">
      {/* Audio & Sound Preferences */}
      <section aria-labelledby="sound-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="sound-heading" className="text-base font-bold text-charcoal dark:text-foreground">
                Audio Chimes
              </h2>
              <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
                Synthesized two-tone chimes for incoming messages while active.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestSound}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#251D22] px-3 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground transition-[background-color,border-color,color,transform] duration-150 ease-out',
              'hover:bg-stone/50 dark:hover:bg-[#2D2329] hover:text-wine active:scale-95',
              testedSound && 'border-wine text-wine'
            )}
          >
            {testedSound ? <Check className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{testedSound ? 'Playing…' : 'Test Chime'}</span>
          </button>
        </div>

        <div className="mt-5 border-t border-stone-subtle dark:border-[#382832]/60 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="sound-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                Message Received Chime
              </label>
              <p className="text-xs text-muted dark:text-muted-foreground">
                Plays a subtle audio notification when receiving a new message.
              </p>
            </div>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={(val) => updateNotifications({ soundEnabled: val })}
              aria-label="Message received chime"
            />
          </div>
        </div>
      </section>

      {/* Browser Desktop Notifications */}
      <section aria-labelledby="browser-notif-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="browser-notif-heading" className="text-base font-bold text-charcoal dark:text-foreground">
                Browser Desktop Alerts
              </h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                  permissionState === 'granted'
                    ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                    : permissionState === 'denied'
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    : 'bg-stone/60 dark:bg-[#2D2329] text-muted dark:text-muted-foreground'
                )}
              >
                {permissionState === 'granted' ? 'Allowed' : permissionState === 'denied' ? 'Blocked' : 'Not Requested'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted dark:text-muted-foreground leading-relaxed">
              Receives operating system alerts when you receive a message and the Nexus.talks tab is in the background.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-stone dark:border-[#382832] bg-porcelain/60 dark:bg-[#251D22]/60 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-muted dark:text-muted-foreground leading-relaxed">
              {permissionState === 'granted' ? (
                <span className="text-charcoal dark:text-foreground font-medium">
                  Browser notification permission is granted. Alerts will display when the tab is in the background.
                </span>
              ) : permissionState === 'denied' ? (
                <span className="text-muted dark:text-muted-foreground">
                  Notifications are blocked in your browser settings. To enable them, adjust permissions in your browser URL bar.
                </span>
              ) : (
                <span>
                  Click below to request permission from your browser to display background desktop alerts.
                </span>
              )}
            </div>

            {permissionState !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="shrink-0 rounded-xl bg-wine px-4 py-2 text-xs font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-wine-hover active:scale-95"
              >
                Request Permission
              </button>
            )}
          </div>
        </div>

        {/* Honest Architecture Disclosure */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-stone-subtle dark:border-[#382832]/60 bg-porcelain/40 dark:bg-[#251D22]/40 p-3.5 text-xs text-muted dark:text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Architecture Notice:</strong> Desktop alerts function while your browser has Nexus.talks open (active or background tabs). Receiving notifications when the browser application is completely closed requires background web-push service workers, currently scheduled for upcoming backend upgrades.
          </p>
        </div>
      </section>

      {/* In-App & Privacy Preferences */}
      <section aria-labelledby="inapp-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="inapp-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          In-App Alerts & Notification Privacy
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Controls how messages are signaled inside the workspace and on shared displays.
        </p>

        <div className="mt-5 divide-y divide-stone-subtle dark:divide-[#382832]/60">
          {/* In-App Toast Alerts */}
          <div className="flex items-center justify-between py-4 first:pt-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="inapp-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  In-App Notification Banners
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Shows visual notification toasts when receiving a message outside the active chat view.
                </p>
              </div>
            </div>
            <Switch
              id="inapp-toggle"
              checked={inAppAlerts}
              onCheckedChange={(val) => updateNotifications({ inAppAlerts: val })}
              aria-label="In-app notification banners"
            />
          </div>

          {/* Include Preview in Notification */}
          <div className="flex items-center justify-between py-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="notif-preview-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Include Message Text in Notifications
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Displays the sender&apos;s message snippet in desktop alerts. When disabled, notifications simply state &quot;New message received&quot;.
                </p>
              </div>
            </div>
            <Switch
              id="notif-preview-toggle"
              checked={includePreviewInNotification}
              onCheckedChange={(val) => updateNotifications({ includePreviewInNotification: val })}
              aria-label="Include message text in notifications"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

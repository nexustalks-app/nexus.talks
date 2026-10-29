'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallAppDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppDialog({ isOpen, onClose }: InstallAppDialogProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'android'>('pwa');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Register Service Worker for PWA compliance
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[Nexus PWA] Service worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Nexus PWA] Service worker registration ignored:', err);
        });
    }

    // Check if already installed
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNativePwaInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallSuccess(true);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('[Nexus PWA] Install prompt failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-charcoal/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-wine/20 dark:border-wine/30 bg-porcelain dark:bg-[#1E161C] p-6 sm:p-8 shadow-2xl transition-all max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl text-muted dark:text-muted-foreground hover:bg-stone/40 dark:hover:bg-[#2B1F27] hover:text-charcoal dark:hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine"
          aria-label="Close installation dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wine text-white shadow-md shadow-wine/25 border-t border-white/20">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h2 id="install-dialog-title" className="text-xl font-bold font-serif text-charcoal dark:text-foreground">
              Install Nexus.talks
            </h2>
            <p className="text-xs text-muted dark:text-muted-foreground">
              Choose your preferred installation method
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-2xl bg-stone/40 dark:bg-[#291F26] p-1.5 mb-6">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pwa'
                ? 'bg-white dark:bg-[#1A1218] text-charcoal dark:text-foreground shadow-xs'
                : 'text-muted dark:text-stone/70 hover:text-charcoal dark:hover:text-foreground'
            }`}
          >
            <Laptop className="h-4 w-4" />
            <span>Web App (Instant PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'android'
                ? 'bg-white dark:bg-[#1A1218] text-charcoal dark:text-foreground shadow-xs'
                : 'text-muted dark:text-stone/70 hover:text-charcoal dark:hover:text-foreground'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Android Native (.apk)</span>
          </button>
        </div>

        {/* TAB 1: PWA Web Installation */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 animate-fade-in">
            {installSuccess || isInstalled ? (
              <div className="rounded-2xl border border-emerald-600/30 bg-emerald-500/10 p-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Nexus.talks is Installed!
                </h3>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                  You can now launch Nexus.talks directly from your home screen or dock anytime.
                </p>
              </div>
            ) : deferredPrompt ? (
              <div className="rounded-2xl border border-wine/30 bg-white/70 dark:bg-[#251D23] p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-charcoal dark:text-foreground">
                      Ready for 1-Click Installation
                    </h3>
                    <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
                      Your browser supports instant native installation to your device.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-3 w-3" />
                    <span>Eligible</span>
                  </span>
                </div>

                <button
                  onClick={handleNativePwaInstall}
                  className="w-full mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-sm shadow-wine/25 transition-all active:scale-[0.98] border-t border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine"
                >
                  <Download className="h-4 w-4" />
                  <span>Install Web App to Device</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-subtle dark:border-[#382833] bg-white/60 dark:bg-[#221820] p-4 text-xs text-muted dark:text-stone/80">
                <p className="font-semibold text-charcoal dark:text-foreground mb-1">
                  Browser-Assisted Installation
                </p>
                <p className="text-[12px] leading-relaxed">
                  Install Nexus.talks to your device home screen or application launcher in two taps:
                </p>
              </div>
            )}

            {/* Platform Instructions */}
            <div className="rounded-2xl border border-stone-subtle dark:border-[#382833] bg-white/80 dark:bg-[#20181E] p-4 space-y-3 text-xs text-muted dark:text-stone/80">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone/40 dark:bg-[#2C212A] text-charcoal dark:text-foreground shrink-0 font-bold text-[11px]">
                  iOS
                </div>
                <div>
                  <span className="font-semibold text-charcoal dark:text-foreground">Safari (iPhone/iPad):</span>
                  <p className="mt-0.5 leading-relaxed">
                    Tap the <strong className="text-charcoal dark:text-foreground">Share</strong> icon <Share2 className="inline h-3 w-3 -mt-0.5" /> at the bottom of Safari, then select <strong className="text-charcoal dark:text-foreground">&ldquo;Add to Home Screen&rdquo;</strong>.
                  </p>
                </div>
              </div>

              <div className="border-t border-stone-subtle dark:border-[#2D222B] pt-2.5 flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone/40 dark:bg-[#2C212A] text-charcoal dark:text-foreground shrink-0 font-bold text-[11px]">
                  And
                </div>
                <div>
                  <span className="font-semibold text-charcoal dark:text-foreground">Chrome / Firefox (Android):</span>
                  <p className="mt-0.5 leading-relaxed">
                    Tap menu <strong className="text-charcoal dark:text-foreground">⋮</strong> in the top-right, then select <strong className="text-charcoal dark:text-foreground">&ldquo;Add to Home screen&rdquo;</strong> or <strong className="text-charcoal dark:text-foreground">&ldquo;Install app&rdquo;</strong>.
                  </p>
                </div>
              </div>

              <div className="border-t border-stone-subtle dark:border-[#2D222B] pt-2.5 flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone/40 dark:bg-[#2C212A] text-charcoal dark:text-foreground shrink-0 font-bold text-[11px]">
                  PC
                </div>
                <div>
                  <span className="font-semibold text-charcoal dark:text-foreground">Desktop (Chrome/Edge):</span>
                  <p className="mt-0.5 leading-relaxed">
                    Click the <strong className="text-charcoal dark:text-foreground">Install</strong> icon in the right side of your browser address bar.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                onClick={onClose}
                className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] border-t border-white/20"
              >
                <span>Launch in Browser</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 2: Android Native App Details */}
        {activeTab === 'android' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-2xl border border-stone-subtle dark:border-[#382833] bg-white/70 dark:bg-[#221820] p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-wine dark:text-[#E2A6B3]" />
                  <span className="text-sm font-bold text-charcoal dark:text-foreground">
                    Native Wrapper Client
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-wine/10 dark:bg-wine/20 px-2.5 py-0.5 text-[11px] font-semibold text-wine dark:text-[#F7B6C4]">
                  v1.0.0 Release
                </span>
              </div>

              <div className="space-y-2 text-xs text-muted dark:text-stone/80">
                <div className="flex justify-between py-1 border-b border-stone-subtle/60 dark:border-[#2D222B]">
                  <span>Package ID:</span>
                  <code className="font-mono text-charcoal dark:text-foreground">com.nexustalks.app</code>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-subtle/60 dark:border-[#2D222B]">
                  <span>Production Endpoint:</span>
                  <code className="font-mono text-wine dark:text-[#E2A6B3]">https://nexus-talks.onrender.com</code>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-subtle/60 dark:border-[#2D222B]">
                  <span>Target Platform:</span>
                  <span className="text-charcoal dark:text-foreground font-medium">Android 15 (API 35)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Signing & Security:</span>
                  <span className="text-charcoal dark:text-foreground font-medium">v2 Scheme · TLS Enforced</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-subtle dark:border-[#382833] bg-white/50 dark:bg-[#1E151C] p-4 text-xs text-muted dark:text-stone/80 leading-relaxed">
              <p className="font-semibold text-charcoal dark:text-foreground mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Verified Public Release Ready</span>
              </p>
              <p>
                Signed production release (<code>nexus-talks-v1.0.0.apk</code>, 5.0 MB) is ready for direct installation.
              </p>
              <div className="mt-2.5 rounded-xl bg-porcelain dark:bg-[#181216] border border-stone-subtle dark:border-[#33252E] p-2.5 text-[11.5px] text-muted-foreground">
                <strong className="text-charcoal dark:text-foreground">Android Installation Note:</strong> When opening the APK, Android security will ask you to approve installation from your browser. Tap <em>Settings → Allow from this source</em> to complete installation.
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <a
                href="https://github.com/nexustalks-app/nexus.talks/releases/download/v1.0.0/nexus-talks-v1.0.0.apk"
                download="nexus-talks-v1.0.0.apk"
                className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] border-t border-white/20"
              >
                <Download className="h-4 w-4" />
                <span>Download Android App (.apk)</span>
              </a>
              <button
                type="button"
                onClick={() => setActiveTab('pwa')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-strong/70 dark:border-[#42313D] bg-white/80 dark:bg-[#251D22]/80 px-4 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-stone/30 transition-all"
              >
                <Laptop className="h-4 w-4 text-wine dark:text-[#E2A6B3]" />
                <span>Web App Option</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

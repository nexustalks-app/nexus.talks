'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Monitor,
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
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'android'>('pwa');
  const [installSuccess, setInstallSuccess] = useState(false);

  // Mount detection for Next.js SSR / Portal safety
  useEffect(() => {
    setMounted(true);
  }, []);

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

    // Check if already installed in standalone display mode
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
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open to prevent underlying page bleeding or scrolling
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
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

  // Do not render during SSR or when closed
  if (!mounted || !isOpen) return null;

  const dialogContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#161315]/80 dark:bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[#E5E0DC] dark:border-[#382833] bg-[#FAF8F5] dark:bg-[#1E161C] p-6 sm:p-7 shadow-2xl shadow-black/40 flex flex-col my-auto max-h-[min(90vh,660px)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl text-muted dark:text-stone/70 hover:bg-stone/30 dark:hover:bg-[#2C212A] hover:text-charcoal dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine"
          aria-label="Close installation dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-3.5 mb-5 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-wine text-white shadow-md shadow-wine/25 border-t border-white/20 shrink-0">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 pr-8">
            <h2 id="install-dialog-title" className="text-xl font-bold font-serif text-charcoal dark:text-foreground tracking-tight">
              Install Nexus.talks
            </h2>
            <p className="text-xs text-muted dark:text-stone/70 mt-0.5">
              Choose your preferred installation method
            </p>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex rounded-2xl bg-[#ECE8E5] dark:bg-[#2A1E27] p-1.5 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pwa'
                ? 'bg-white dark:bg-[#161014] text-charcoal dark:text-white shadow-xs'
                : 'text-muted dark:text-stone/70 hover:text-charcoal dark:hover:text-white'
            }`}
          >
            <Laptop className="h-4 w-4 shrink-0" />
            <span>Web App (PWA)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'android'
                ? 'bg-white dark:bg-[#161014] text-charcoal dark:text-white shadow-xs'
                : 'text-muted dark:text-stone/70 hover:text-charcoal dark:hover:text-white'
            }`}
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Android Native (.apk)</span>
          </button>
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: PWA Web Installation */}
          {activeTab === 'pwa' && (
            <div className="space-y-4 animate-fade-in">
              {installSuccess || isInstalled ? (
                <div className="rounded-2xl border border-emerald-600/30 bg-emerald-500/10 p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    Nexus.talks is Installed
                  </h3>
                  <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    You can launch Nexus.talks directly from your home screen or application launcher anytime.
                  </p>
                </div>
              ) : deferredPrompt ? (
                <div className="rounded-2xl border border-wine/25 bg-white dark:bg-[#251B22] p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-charcoal dark:text-foreground">
                        Ready for 1-Click Installation
                      </h3>
                      <p className="mt-0.5 text-xs text-muted dark:text-stone/70">
                        Your browser supports instant native installation to your device.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Sparkles className="h-3 w-3" />
                      <span>Supported</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNativePwaInstall}
                    className="w-full mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] border-t border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine"
                  >
                    <Download className="h-4 w-4" />
                    <span>Install Web App to Device</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#E5E0DC] dark:border-[#382833] bg-white dark:bg-[#251B22] p-4 text-xs text-muted dark:text-stone/80">
                  <p className="font-semibold text-charcoal dark:text-foreground mb-1">
                    Browser-Assisted Installation
                  </p>
                  <p className="text-[12px] leading-relaxed">
                    Install Nexus.talks to your device home screen or application dock in two quick steps:
                  </p>
                </div>
              )}

              {/* Platform Instructions Card */}
              <div className="rounded-2xl border border-[#E5E0DC] dark:border-[#382833] bg-white dark:bg-[#251B22] p-4 space-y-3.5 text-xs text-muted dark:text-stone/80 shadow-xs">
                {/* iOS Safari */}
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECE8E5] dark:bg-[#2C212A] text-charcoal dark:text-foreground shrink-0 font-bold text-[11px]">
                    iOS
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-charcoal dark:text-foreground">Safari (iPhone / iPad):</span>
                    <p className="mt-0.5 leading-relaxed text-[12px]">
                      Tap the <strong className="text-charcoal dark:text-foreground">Share</strong> icon <Share2 className="inline h-3 w-3 -mt-0.5" /> at the bottom of Safari, then choose <strong className="text-charcoal dark:text-foreground">&ldquo;Add to Home Screen&rdquo;</strong>.
                    </p>
                  </div>
                </div>

                {/* Android Chrome */}
                <div className="border-t border-[#ECE8E5] dark:border-[#2D222B] pt-3 flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECE8E5] dark:bg-[#2C212A] text-charcoal dark:text-foreground shrink-0 font-bold text-[11px]">
                    And
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-charcoal dark:text-foreground">Chrome / Firefox (Android):</span>
                    <p className="mt-0.5 leading-relaxed text-[12px]">
                      Tap menu <strong className="text-charcoal dark:text-foreground">⋮</strong> in the top-right, then select <strong className="text-charcoal dark:text-foreground">&ldquo;Add to Home screen&rdquo;</strong> or <strong className="text-charcoal dark:text-foreground">&ldquo;Install app&rdquo;</strong>.
                    </p>
                  </div>
                </div>

                {/* Desktop */}
                <div className="border-t border-[#ECE8E5] dark:border-[#2D222B] pt-3 flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECE8E5] dark:bg-[#2C212A] text-charcoal dark:text-foreground shrink-0 font-bold text-[11px]">
                    <Monitor className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-charcoal dark:text-foreground">Desktop (Chrome / Edge / Brave):</span>
                    <p className="mt-0.5 leading-relaxed text-[12px]">
                      Click the <strong className="text-charcoal dark:text-foreground">Install</strong> icon in the right side of your browser address bar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Direct Browser Access Link */}
              <div className="pt-1">
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
              <div className="rounded-2xl border border-[#E5E0DC] dark:border-[#382833] bg-white dark:bg-[#251B22] p-4.5 shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-wine dark:text-[#E2A6B3]" />
                    <span className="text-sm font-bold text-charcoal dark:text-foreground">
                      Android Native Client
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-wine/10 dark:bg-wine/20 px-2.5 py-0.5 text-[11px] font-semibold text-wine dark:text-[#F7B6C4]">
                    v1.0.1 Release
                  </span>
                </div>

                <div className="space-y-2 text-xs text-muted dark:text-stone/80">
                  <div className="flex justify-between py-1 border-b border-[#ECE8E5] dark:border-[#2D222B]">
                    <span>Package ID:</span>
                    <code className="font-mono text-charcoal dark:text-foreground font-medium">com.nexustalks.app</code>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ECE8E5] dark:border-[#2D222B]">
                    <span>Server Endpoint:</span>
                    <code className="font-mono text-wine dark:text-[#E2A6B3]">https://nexus-talks.onrender.com</code>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ECE8E5] dark:border-[#2D222B]">
                    <span>Target Platform:</span>
                    <span className="text-charcoal dark:text-foreground font-medium">Android 15 (API 35)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Security & Signing:</span>
                    <span className="text-charcoal dark:text-foreground font-medium">v2 Scheme · TLS Enforced</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E0DC] dark:border-[#382833] bg-white dark:bg-[#251B22] p-4 text-xs text-muted dark:text-stone/80 leading-relaxed shadow-xs">
                <p className="font-semibold text-charcoal dark:text-foreground mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Verified Public Release Ready</span>
                </p>
                <p className="text-[12px]">
                  Official signed production APK (<code>nexus-talks-v1.0.1.apk</code>, 5.0 MB) tested on Android 14/15.
                </p>
                <div className="mt-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#181216] border border-[#ECE8E5] dark:border-[#33252E] p-2.5 text-[11.5px] text-muted-foreground leading-normal">
                  <strong className="text-charcoal dark:text-foreground">Android Installation Note:</strong> When opening the downloaded APK, Android will ask you to approve installation from your browser. Tap <em>Settings → Allow from this source</em> to complete installation.
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <a
                  href="https://github.com/nexustalks-app/nexus.talks/releases/download/v1.0.1/nexus-talks-v1.0.1.apk"
                  download="nexus-talks-v1.0.1.apk"
                  className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] border-t border-white/20 whitespace-nowrap"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>Download Android App (.apk)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveTab('pwa')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-strong/70 dark:border-[#42313D] bg-[#FAF8F5] dark:bg-[#251D22] px-4 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-stone/30 transition-all whitespace-nowrap"
                >
                  <Laptop className="h-4 w-4 text-wine dark:text-[#E2A6B3] shrink-0" />
                  <span>Web App Details</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

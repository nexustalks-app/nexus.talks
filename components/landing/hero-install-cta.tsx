'use client';

import React, { useState } from 'react';
import { Download, Laptop } from 'lucide-react';
import { InstallAppDialog } from './install-app-dialog';

export const ANDROID_APK_DOWNLOAD_URL =
  'https://github.com/nexustalks-app/nexus.talks/releases/download/v1.0.1/nexus-talks-v1.0.1.apk';
export const ANDROID_APK_VERSION = 'v1.0.1';
export const ANDROID_APK_SIZE = '5.0 MB';

interface HeroInstallCtaProps {
  className?: string;
  variant?: 'primary' | 'download-only' | 'pwa-only';
}

export function HeroInstallCta({ className, variant = 'primary' }: HeroInstallCtaProps) {
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  if (variant === 'download-only') {
    return (
      <a
        href={ANDROID_APK_DOWNLOAD_URL}
        download="nexus-talks-v1.0.1.apk"
        className={
          className ||
          'inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-wine px-6 text-[14px] font-semibold text-white shadow-md shadow-wine/25 transition-all duration-150 ease-out hover:bg-wine-hover hover:scale-[1.02] active:scale-[0.98] border-t border-white/20 whitespace-nowrap shrink-0'
        }
        aria-label={`Download Nexus.talks Android APK (${ANDROID_APK_VERSION}, ${ANDROID_APK_SIZE})`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap leading-none">Download Android App (.apk)</span>
      </a>
    );
  }

  if (variant === 'pwa-only') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsPwaModalOpen(true)}
          className={
            className ||
            'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] border-t border-white/20 whitespace-nowrap shrink-0'
          }
          aria-label="Install Nexus.talks Web App (PWA)"
        >
          <Laptop className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap leading-none">Install Web App</span>
        </button>
        <InstallAppDialog isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      {/* 1. Primary Action: Direct Android APK Download */}
      <a
        href={ANDROID_APK_DOWNLOAD_URL}
        download="nexus-talks-v1.0.1.apk"
        className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-wine px-5 sm:px-6 text-[13.5px] sm:text-[14px] font-semibold text-white shadow-md shadow-wine/25 transition-all duration-150 ease-out hover:bg-wine-hover hover:scale-[1.02] active:scale-[0.98] border-t border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
        aria-label={`Download Android App APK (${ANDROID_APK_VERSION}, ${ANDROID_APK_SIZE})`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap leading-none">Download Android App (.apk)</span>
      </a>

      {/* 2. Secondary Action: Web App (PWA) Modal */}
      <button
        type="button"
        onClick={() => setIsPwaModalOpen(true)}
        className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-stone-strong/70 dark:border-[#4B3944] bg-white/90 dark:bg-[#251D22]/90 px-4 sm:px-4.5 text-[13.5px] sm:text-[14px] font-medium text-charcoal dark:text-foreground shadow-2xs transition-all duration-150 ease-out hover:bg-stone/30 hover:border-wine/50 hover:text-wine hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
        aria-label="Install Nexus.talks Web App (PWA)"
      >
        <Laptop className="h-4 w-4 text-wine dark:text-[#E2A6B3] shrink-0" />
        <span className="whitespace-nowrap leading-none">Install Web App</span>
      </button>

      {/* Portal Dialog Modal */}
      <InstallAppDialog isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} />
    </>
  );
}

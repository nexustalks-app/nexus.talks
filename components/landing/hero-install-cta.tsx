'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { InstallAppDialog } from './install-app-dialog';

interface HeroInstallCtaProps {
  className?: string;
}

export function HeroInstallCta({ className }: HeroInstallCtaProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          'inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-2xl bg-wine px-8 text-[14.5px] font-semibold text-white shadow-md shadow-wine/25 transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-wine-hover hover:scale-[1.02] active:scale-[0.98] border-t border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2'
        }
        aria-label="Install Nexus.talks App on your device"
      >
        <Download className="h-4 w-4" />
        <span>Install App</span>
      </button>

      <InstallAppDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

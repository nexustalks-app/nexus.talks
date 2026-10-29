'use client';

import { ShieldCheck } from 'lucide-react';

export function DemoBanner() {
  return (
    <aside
      aria-label="Demo Mode Notification"
      className="hidden sm:block shrink-0 border-b border-[var(--border)] bg-white/95 dark:bg-[#1C151A]/95 text-charcoal dark:text-white px-4 py-2 shadow-xs transition-colors duration-150 animate-fade-down"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 text-xs">
        {/* Left: Badge & Notice */}
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-wine/10 dark:bg-wine/30 border border-wine/25 dark:border-white/20 px-2.5 py-0.5 font-mono text-[10.5px] font-bold tracking-wider uppercase text-wine dark:text-[#F7B6C4]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>DEMO MODE</span>
          </span>
          <span className="text-muted dark:text-[#E8E2DE]/90 font-medium">
            Explore using sample data. No real messages will be sent.
          </span>
        </div>
      </div>
    </aside>
  );
}

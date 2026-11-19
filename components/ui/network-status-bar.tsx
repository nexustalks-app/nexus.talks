'use client';

import React, { useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '@/lib/network/network-status';
import { cn } from '@/lib/utils/cn';

export function NetworkStatusBar() {
  const { isOnline, isReconnecting, isCaptiveOrUnstable, checkConnection } = useNetworkStatus();
  const [isChecking, setIsChecking] = useState(false);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await checkConnection();
    } finally {
      setIsChecking(false);
    }
  };

  // If fully online and not in transitional reconnecting state, render nothing
  if (isOnline && !isReconnecting) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        'relative z-40 w-full px-4 py-2 text-xs font-medium transition-all duration-300 ease-out border-b shadow-xs',
        !isOnline
          ? 'bg-[#3A141E] text-[#FFE6EB] border-[#661E2E] dark:bg-[#2C0F17] dark:border-[#541B26]'
          : 'bg-[#122A1E] text-[#E0F5E9] border-[#1D4A34] dark:bg-[#0D1F16] dark:border-[#173D2B]'
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {!isOnline ? (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-rose-300" />
              <span className="truncate">
                {isCaptiveOrUnstable
                  ? 'Connection unstable or sign-in required. Messages are safely queued.'
                  : 'You are currently offline. Messages will queue and send automatically when reconnected.'}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300 animate-fade-in" />
              <span className="truncate">
                Back online. Synchronizing your conversations...
              </span>
            </>
          )}
        </div>

        {!isOnline && (
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-[#FFE6EB] transition-all disabled:opacity-50 text-[11px]"
          >
            <RefreshCw className={cn('h-3 w-3', isChecking && 'animate-spin')} />
            <span>{isChecking ? 'Checking…' : 'Check now'}</span>
          </button>
        )}
      </div>
    </aside>
  );
}

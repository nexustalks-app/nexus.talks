'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isChunkLoadError(err: Error): boolean {
  const msg = err.message?.toLowerCase() || '';
  const name = err.name?.toLowerCase() || '';
  return (
    name === 'chunkloaderror' ||
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('dynamically imported module') ||
    msg.includes('failed to fetch dynamically imported module') ||
    (msg.includes('failed to load') && (msg.includes('chunk') || msg.includes('module') || msg.includes('/_next/')))
  );
}

const CHUNK_RETRY_KEY = 'nx.chunk_retry_ts';
const RETRY_COOLDOWN_MS = 15000;

async function performSafeReload() {
  try {
    sessionStorage.removeItem(CHUNK_RETRY_KEY);
  } catch {
    // ignore
  }

  // 1. Unregister any stale service workers
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch {
      // ignore
    }
  }

  // 2. Clear browser cache storage
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // ignore
    }
  }

  // 3. Bypass mobile HTTP disk cache using cache-busting timestamp
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_v', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }
}

export default function RootError({ error, reset }: ErrorProps) {
  const [isChunkError, setIsChunkError] = useState(false);
  const [autoRetrying, setAutoRetrying] = useState(false);

  useEffect(() => {
    if (isChunkLoadError(error)) {
      setIsChunkError(true);
      try {
        const lastRetry = sessionStorage.getItem(CHUNK_RETRY_KEY);
        const now = Date.now();

        if (!lastRetry || now - parseInt(lastRetry, 10) > RETRY_COOLDOWN_MS) {
          sessionStorage.setItem(CHUNK_RETRY_KEY, String(now));
          setAutoRetrying(true);
          performSafeReload();
          return;
        }
      } catch {
        // sessionStorage restricted
      }
    }
  }, [error]);

  const handleManualReload = () => {
    setAutoRetrying(true);
    performSafeReload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-porcelain dark:bg-[#0E0B0D] px-4 text-center">
      <div className="liquid-glass-card w-full max-w-md rounded-3xl p-8 shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
          <AlertCircle className="h-6 w-6" strokeWidth={2} />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-charcoal dark:text-foreground">
          {isChunkError ? 'Application Update' : 'Something went wrong'}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted dark:text-muted-foreground">
          {autoRetrying
            ? 'Refreshing the application to load the latest version…'
            : isChunkError
            ? 'A newer version of the application or a network interruption caused a script loading issue. Please reload.'
            : 'An unexpected error occurred while loading this view.'}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleManualReload}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-wine px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-wine-hover active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Reload App
          </button>
          {!isChunkError && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-xl border border-stone dark:border-[#3B2C34] bg-porcelain dark:bg-[#271E23] px-5 py-2.5 text-sm font-medium text-charcoal dark:text-foreground transition hover:bg-stone/50 dark:hover:bg-[#342730] active:scale-[0.98]"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

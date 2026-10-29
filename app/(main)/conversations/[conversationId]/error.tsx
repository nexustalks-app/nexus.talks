'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';

interface ConversationErrorProps {
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

export default function ConversationError({ error, reset }: ConversationErrorProps) {
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
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-porcelain px-6 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-stone bg-white p-6 shadow-md">
        <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-wine/10 text-wine">
          <AlertCircle className="h-5 w-5" strokeWidth={2} />
        </div>

        <h2 className="text-lg font-semibold text-charcoal">
          {isChunkError ? 'Chat View Outdated' : "Couldn't load conversation"}
        </h2>

        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {autoRetrying
            ? 'Refreshing conversation to load the latest version…'
            : isChunkError
            ? 'A newer version of the conversation component is available. Refreshing will update it.'
            : error?.message || 'An unexpected error occurred while loading this conversation.'}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {isChunkError ? (
            <button
              type="button"
              onClick={handleManualReload}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-wine px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-wine-hover active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Page
            </button>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-wine px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-wine-hover active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          )}

          <Link
            href="/conversations"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone bg-porcelain px-4 py-2 text-xs font-medium text-charcoal transition hover:bg-stone/50 active:scale-[0.98]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Back to Conversations
          </Link>
        </div>
      </div>
    </div>
  );
}

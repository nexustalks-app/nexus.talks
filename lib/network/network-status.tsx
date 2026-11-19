'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkStatusContextType {
  isOnline: boolean;
  isReconnecting: boolean;
  isCaptiveOrUnstable: boolean;
  offlineSince: Date | null;
  checkConnection: () => Promise<boolean>;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  isReconnecting: false,
  isCaptiveOrUnstable: false,
  offlineSince: null,
  checkConnection: async () => true,
});

export function useNetworkStatus(): NetworkStatusContextType {
  return useContext(NetworkStatusContext);
}

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [isCaptiveOrUnstable, setIsCaptiveOrUnstable] = useState<boolean>(false);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);
  const wasOfflineRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsCaptiveOrUnstable(false);
      return false;
    }

    try {
      // Lightweight cache-busted ping to healthcheck with 3s timeout
      const res = await fetch('/api/healthcheck?ping=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      const contentType = res.headers.get('content-type') || '';
      // Captive portal detection: portals often return 200/302 with HTML login pages
      if (!res.ok || !contentType.includes('application/json')) {
        setIsOnline(false);
        setIsCaptiveOrUnstable(true);
        return false;
      }

      const data = await res.json().catch(() => null);
      const isHealthy = data?.status === 'ok';
      setIsOnline(isHealthy);
      setIsCaptiveOrUnstable(!isHealthy);
      return isHealthy;
    } catch {
      // If server unreachable, mark offline
      setIsOnline(false);
      setIsCaptiveOrUnstable(true);
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineSince(null);

      // If we were previously offline, show gentle reconnecting toast
      if (wasOfflineRef.current) {
        setIsReconnecting(true);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          setIsReconnecting(false);
          wasOfflineRef.current = false;
        }, 2800);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setOfflineSince(new Date());
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        setIsReconnecting(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  return (
    <NetworkStatusContext.Provider
      value={{
        isOnline,
        isReconnecting,
        isCaptiveOrUnstable,
        offlineSince,
        checkConnection,
      }}
    >
      {children}
    </NetworkStatusContext.Provider>
  );
}

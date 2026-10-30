'use client';

import React, {
  createContext,
  useContext,
  useState,
  useTransition,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useRouter, usePathname, useSelectedLayoutSegment } from 'next/navigation';

export interface NavigationError {
  conversationId: string;
  message: string;
}

interface ConversationNavigationContextType {
  navigatingId: string | null;
  activeId: string | null;
  isNavigating: boolean;
  navigationError: NavigationError | null;
  openConversation: (id: string) => void;
  retryNavigation: () => void;
  clearNavigation: () => void;
  clearNavigationError: () => void;
}

const ConversationNavigationContext = createContext<ConversationNavigationContextType>({
  navigatingId: null,
  activeId: null,
  isNavigating: false,
  navigationError: null,
  openConversation: () => {},
  retryNavigation: () => {},
  clearNavigation: () => {},
  clearNavigationError: () => {},
});

export function useConversationNavigation() {
  return useContext(ConversationNavigationContext);
}

export function ConversationNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();

  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState<NavigationError | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastAttemptedIdRef = useRef<string | null>(null);

  const activeId =
    segment ||
    (pathname.startsWith('/conversations/') ? pathname.split('/')[2] || null : null);

  // When pathname or segment updates to match the navigation target, clear navigatingId and any errors
  useEffect(() => {
    if (activeId && navigatingId === activeId) {
      setNavigatingId(null);
      setNavigationError(null);
    }
  }, [activeId, navigatingId]);

  // When the React transition finishes, clear navigatingId immediately
  useEffect(() => {
    if (!isPending && navigatingId) {
      setNavigatingId(null);
    }
  }, [isPending, navigatingId]);

  // Safety fallback timeout: never keep UI locked in navigating state for > 8 seconds
  // Surface error notification so the user knows what happened and can retry
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (navigatingId) {
      const targetId = navigatingId;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setNavigatingId(null);
        setNavigationError({
          conversationId: targetId,
          message: 'Opening conversation took longer than expected. Please check your connection and try again.',
        });
      }, 8000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [navigatingId]);

  const openConversation = useCallback(
    (id: string) => {
      if (!id) return;

      // 1. If we are already viewing this conversation, no navigation is needed
      if (activeId === id) {
        setNavigationError(null);
        return;
      }

      // 2. If navigation to this EXACT conversation is ALREADY in flight,
      // ignore subsequent rapid clicks! This prevents cancelling the active RSC request.
      if (navigatingId === id) {
        return;
      }

      // 3. Clear existing navigation error and record attempt
      setNavigationError(null);
      lastAttemptedIdRef.current = id;

      // 4. Immediately set navigatingId for instant visual feedback (Wine highlight & loading spinner)
      setNavigatingId(id);

      // 5. Start the App Router transition
      startTransition(() => {
        router.push(`/conversations/${id}`);
      });
    },
    [activeId, navigatingId, router]
  );

  const retryNavigation = useCallback(() => {
    if (lastAttemptedIdRef.current) {
      openConversation(lastAttemptedIdRef.current);
    }
  }, [openConversation]);

  const clearNavigation = useCallback(() => {
    setNavigatingId(null);
  }, []);

  const clearNavigationError = useCallback(() => {
    setNavigationError(null);
  }, []);

  return (
    <ConversationNavigationContext.Provider
      value={{
        navigatingId,
        activeId,
        isNavigating: Boolean(navigatingId) || isPending,
        navigationError,
        openConversation,
        retryNavigation,
        clearNavigation,
        clearNavigationError,
      }}
    >
      {children}
    </ConversationNavigationContext.Provider>
  );
}

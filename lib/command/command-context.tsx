'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { usePathname } from 'next/navigation';
import type { NexusCommand, CommandContext as AppCommandContext } from './command-types';

interface CommandContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  registerCommands: (commands: NexusCommand[]) => () => void;
  registeredCommands: NexusCommand[];
  appContext: AppCommandContext;
  updateAppContext: (partial: Partial<AppCommandContext>) => void;
}

const CommandContext = createContext<CommandContextValue | undefined>(undefined);

export function useCommand() {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error('useCommand must be used within a CommandProvider');
  }
  return ctx;
}

/**
 * Hook for components to dynamically register contextual commands while mounted
 */
export function useRegisterCommands(commands: NexusCommand[]) {
  const { registerCommands } = useCommand();
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  useEffect(() => {
    return registerCommands(commandsRef.current);
  }, [registerCommands]);
}

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dynamicCommands, setDynamicCommands] = useState<Map<string, NexusCommand[]>>(
    () => new Map()
  );
  const pathname = usePathname() || '/';

  const isDemo = pathname === '/demo' || pathname.startsWith('/demo');
  const isAuthenticated = !isDemo && !['/login', '/signup', '/'].includes(pathname);

  const [contextOverrides, setContextOverrides] = useState<Partial<AppCommandContext>>({});
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const appContext = useMemo<AppCommandContext>(() => {
    let activeConversationId: string | null = null;
    if (pathname.startsWith('/conversations/')) {
      const parts = pathname.split('/');
      if (parts[2]) activeConversationId = parts[2];
    }

    return {
      pathname,
      isDemo,
      isAuthenticated,
      activeConversationId,
      ...contextOverrides,
    };
  }, [pathname, isDemo, isAuthenticated, contextOverrides]);

  const updateAppContext = useCallback((partial: Partial<AppCommandContext>) => {
    setContextOverrides((prev) => ({ ...prev, ...partial }));
  }, []);

  const open = useCallback(() => {
    if (typeof document !== 'undefined') {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Restore focus to the previous active element
    if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
      requestAnimationFrame(() => {
        try {
          previousActiveElementRef.current?.focus();
        } catch {
          // ignore
        }
      });
    }
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const registrationCounterRef = useRef(0);

  const registerCommands = useCallback((commands: NexusCommand[]) => {
    registrationCounterRef.current += 1;
    const registrationId = `cmd-reg-${registrationCounterRef.current}`;
    setDynamicCommands((prev) => {
      const next = new Map(prev);
      next.set(registrationId, commands);
      return next;
    });

    return () => {
      setDynamicCommands((prev) => {
        const next = new Map(prev);
        next.delete(registrationId);
        return next;
      });
    };
  }, []);

  // Global Keyboard Shortcut: Ctrl + K (Windows/Linux) or ⌘ + K (macOS)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isK = e.key === 'k' || e.key === 'K';
      const isModifier = e.ctrlKey || e.metaKey;

      if (isModifier && isK) {
        // Prevent default browser URL search bar hijacking
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [toggle]);

  // Aggregate all dynamically registered commands
  const registeredCommands = useMemo(() => {
    const list: NexusCommand[] = [];
    dynamicCommands.forEach((cmds) => {
      list.push(...cmds);
    });
    return list;
  }, [dynamicCommands]);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      registerCommands,
      registeredCommands,
      appContext,
      updateAppContext,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      registerCommands,
      registeredCommands,
      appContext,
      updateAppContext,
    ]
  );

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  NexusSettings,
  AppearanceSettings,
  AccessibilitySettings,
  ChatSettings,
  NotificationSettings,
  PrivacySettings,
  DEFAULT_SETTINGS,
} from './settings-types';

export type ResolvedTheme =
  | 'light'
  | 'dark'
  | 'midnight-wine'
  | 'arctic-porcelain'
  | 'graphite';

interface SettingsContextValue {
  settings: NexusSettings;
  updateAppearance: (partial: Partial<AppearanceSettings>) => void;
  updateAccessibility: (partial: Partial<AccessibilitySettings>) => void;
  updateChat: (partial: Partial<ChatSettings>) => void;
  updateNotifications: (partial: Partial<NotificationSettings>) => void;
  updatePrivacy: (partial: Partial<PrivacySettings>) => void;
  resetToDefaults: () => void;
  resolvedTheme: ResolvedTheme;
  isDarkTheme: boolean;
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function getStorageKey(userId: string | null): string {
  return userId ? `nx_settings_${userId}` : 'nx_settings';
}

function loadInitialSettings(userId: string | null): NexusSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key) || localStorage.getItem('nx_settings');
    if (!raw) {
      const explicitUserTheme = localStorage.getItem('nexus_user_theme');
      if (
        explicitUserTheme &&
        (explicitUserTheme === 'dark' ||
          explicitUserTheme === 'midnight-wine' ||
          explicitUserTheme === 'arctic-porcelain' ||
          explicitUserTheme === 'graphite' ||
          explicitUserTheme === 'system')
      ) {
        return {
          ...DEFAULT_SETTINGS,
          appearance: {
            ...DEFAULT_SETTINGS.appearance,
            theme: explicitUserTheme as any,
          },
        };
      }
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance || {}) },
      accessibility: { ...DEFAULT_SETTINGS.accessibility, ...(parsed.accessibility || {}) },
      chat: { ...DEFAULT_SETTINGS.chat, ...(parsed.chat || {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...(parsed.privacy || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({
  children,
  initialUserId = null,
}: {
  children: React.ReactNode;
  initialUserId?: string | null;
}) {
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(initialUserId);
  // Initialize with DEFAULT_SETTINGS on both server and initial client render
  // to guarantee 100% deterministic initial hydration with zero mismatch
  const [settings, setSettings] = useState<NexusSettings>(DEFAULT_SETTINGS);
  const [systemDark, setSystemDark] = useState<boolean>(false);

  // Sync user-scoped settings from localStorage after initial mount
  useEffect(() => {
    setSettings(loadInitialSettings(currentUserId));
  }, [currentUserId]);

  // Load user-scoped settings when user changes
  const setCurrentUserId = useCallback((id: string | null) => {
    setCurrentUserIdState(id);
    setSettings(loadInitialSettings(id));
  }, []);

  // Detect system dark mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mql.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Compute resolved theme
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (settings.appearance.theme === 'system') {
      return systemDark ? 'dark' : 'light';
    }
    return settings.appearance.theme;
  }, [settings.appearance.theme, systemDark]);

  const isDarkTheme = useMemo(() => {
    return (
      resolvedTheme === 'dark' ||
      resolvedTheme === 'midnight-wine' ||
      resolvedTheme === 'graphite'
    );
  }, [resolvedTheme]);

  // Apply theme & appearance settings to DOM
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Enable smooth cross-fade transition without flashing
    root.classList.add('nx-theme-transition');
    const timer = setTimeout(() => {
      root.classList.remove('nx-theme-transition');
    }, 260);

    // 1. Theme mode & dataset
    root.setAttribute('data-theme', resolvedTheme);
    if (isDarkTheme) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem('nexus_theme', resolvedTheme);
    } catch {
      // Storage unavailable
    }

    // 2. Chat appearance
    root.setAttribute('data-chat-size', settings.appearance.messageTextSize);
    root.setAttribute('data-chat-spacing', settings.appearance.messageSpacing);
    root.setAttribute('data-chat-density', settings.appearance.chatDensity);
    root.setAttribute('data-bubble-style', settings.appearance.bubbleStyle);

    // 3. Accessibility
    if (settings.accessibility.largerText) {
      root.classList.add('nx-large-text');
    } else {
      root.classList.remove('nx-large-text');
    }

    if (settings.accessibility.highContrast) {
      root.classList.add('nx-high-contrast');
    } else {
      root.classList.remove('nx-high-contrast');
    }

    if (settings.accessibility.reduceMotion) {
      root.classList.add('nx-reduce-motion');
    } else {
      root.classList.remove('nx-reduce-motion');
    }

    if (settings.accessibility.disableAnimations) {
      root.classList.add('nx-disable-anim');
    } else {
      root.classList.remove('nx-disable-anim');
    }

    if (settings.accessibility.enhancedFocus) {
      root.classList.add('nx-focus-visible');
    } else {
      root.classList.remove('nx-focus-visible');
    }
  }, [settings, resolvedTheme, isDarkTheme]);

  // Persist settings
  const persistSettings = useCallback(
    (newSettings: NexusSettings) => {
      if (typeof window === 'undefined') return;
      try {
        const payload = JSON.stringify(newSettings);
        localStorage.setItem('nx_settings', payload);
        if (currentUserId) {
          localStorage.setItem(getStorageKey(currentUserId), payload);
        }
        if (newSettings.appearance?.theme) {
          localStorage.setItem('nexus_user_theme', newSettings.appearance.theme);
        }
      } catch {
        // Storage unavailable
      }
    },
    [currentUserId]
  );

  const updateAppearance = useCallback(
    (partial: Partial<AppearanceSettings>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          appearance: { ...prev.appearance, ...partial },
        };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const updateAccessibility = useCallback(
    (partial: Partial<AccessibilitySettings>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          accessibility: { ...prev.accessibility, ...partial },
        };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const updateChat = useCallback(
    (partial: Partial<ChatSettings>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          chat: { ...prev.chat, ...partial },
        };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const updateNotifications = useCallback(
    (partial: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          notifications: { ...prev.notifications, ...partial },
        };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const updatePrivacy = useCallback(
    (partial: Partial<PrivacySettings>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          privacy: { ...prev.privacy, ...partial },
        };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persistSettings(DEFAULT_SETTINGS);
  }, [persistSettings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateAppearance,
      updateAccessibility,
      updateChat,
      updateNotifications,
      updatePrivacy,
      resetToDefaults,
      resolvedTheme,
      isDarkTheme,
      currentUserId,
      setCurrentUserId,
    }),
    [
      settings,
      updateAppearance,
      updateAccessibility,
      updateChat,
      updateNotifications,
      updatePrivacy,
      resetToDefaults,
      resolvedTheme,
      isDarkTheme,
      currentUserId,
      setCurrentUserId,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

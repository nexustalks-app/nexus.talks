import React from 'react';
import {
  MessageSquare,
  Compass,
  Layers,
  Users,
  User,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Plus,
  Eye,
  LogOut,
  ArrowLeft,
  Home,
  ShieldCheck,
  Search,
  Sliders,
  Share2,
  Bookmark,
  Activity,
  Laptop,
} from 'lucide-react';
import type { NexusCommand, CommandContext } from './command-types';
import type { NexusSettings, AppearanceSettings, AccessibilitySettings, NotificationSettings } from '@/lib/settings/settings-types';
import { DEMO_CONTACTS, DEMO_GROUPS } from '@/components/demo/demo-data';

interface CommandFactoryOptions {
  router: { push: (href: string) => void };
  close: () => void;
  context: CommandContext;
  settings?: NexusSettings;
  updateAppearance?: (partial: Partial<AppearanceSettings>) => void;
  updateAccessibility?: (partial: Partial<AccessibilitySettings>) => void;
  updateNotifications?: (partial: Partial<NotificationSettings>) => void;
  resolvedTheme?: string;
  onDemoSelectContact?: (contactId: string) => void;
  onDemoSelectTab?: (tab: 'messages' | 'pulse' | 'echoes' | 'discovery' | 'communities' | 'groups' | 'settings') => void;
  onDemoOpenLivingProfile?: (contactId: string) => void;
  onDemoOpenStories?: (profileId: string) => void;
}

export function getDefaultCommands({
  router,
  close,
  context,
  settings,
  updateAppearance,
  updateAccessibility,
  updateNotifications,
  resolvedTheme = 'light',
  onDemoSelectContact,
  onDemoSelectTab,
  onDemoOpenLivingProfile,
  onDemoOpenStories,
}: CommandFactoryOptions): NexusCommand[] {
  const isDemo = context.isDemo;
  const isAuthenticated = context.isAuthenticated;
  const commands: NexusCommand[] = [];

  // ── 1. Context-Aware In-Conversation Actions ──────────────────────────────────
  if (context.activeConversationId) {
    commands.push(
      {
        id: 'ctx-return-conversations',
        title: 'Return to Conversations List',
        subtitle: 'Close active chat and return to your messages',
        category: 'context',
        keywords: ['back', 'return', 'conversations', 'exit chat'],
        icon: ArrowLeft,
        shortcut: ['Esc'],
        action: () => {
          close();
          if (isDemo) {
            onDemoSelectTab?.('messages');
          } else {
            router.push('/conversations');
          }
        },
      },
      {
        id: 'ctx-search-messages',
        title: 'Search in this Conversation',
        subtitle: 'Filter messages and find references in this canvas',
        category: 'context',
        keywords: ['search', 'find', 'filter', 'conversation'],
        icon: Search,
        action: () => {
          close();
          // Trigger search input focus if available in DOM
          const searchBtn = document.querySelector('button[title*="Search"], button[aria-label*="Search"]') as HTMLButtonElement | null;
          if (searchBtn) {
            searchBtn.click();
          } else {
            const input = document.querySelector('input[type="search"]') as HTMLInputElement | null;
            input?.focus();
          }
        },
      }
    );
  }

  // ── 2. Primary Navigation Commands ───────────────────────────────────────────
  if (!isDemo) {
    commands.push(
      {
        id: 'nav-messages',
        title: 'Messages',
        subtitle: 'View your conversations and realtime chats',
        category: 'navigate',
        keywords: ['chat', 'messages', 'conversations', 'inbox'],
        icon: MessageSquare,
        shortcut: ['G', 'M'],
        action: () => {
          close();
          router.push('/conversations');
        },
      },
      {
        id: 'nav-pulse',
        title: 'Nexus Pulse',
        subtitle: 'Privacy-conscious overview of recent activity and unread threads',
        category: 'navigate',
        keywords: ['pulse', 'activity', 'overview', 'unread', 'live'],
        icon: Activity,
        shortcut: ['G', 'U'],
        action: () => {
          close();
          router.push('/pulse');
        },
      },
      {
        id: 'nav-echoes',
        title: 'Nexus Echoes',
        subtitle: 'Your saved moments, bookmarked messages, and private notes',
        category: 'navigate',
        keywords: ['echoes', 'saved', 'bookmarks', 'notes', 'moments'],
        icon: Bookmark,
        shortcut: ['G', 'E'],
        action: () => {
          close();
          router.push('/echoes');
        },
      },
      {
        id: 'nav-communities',
        title: 'Communities',
        subtitle: 'Explore public topic salons and creative spaces',
        category: 'navigate',
        keywords: ['communities', 'salons', 'explore', 'topics'],
        icon: Compass,
        shortcut: ['G', 'C'],
        action: () => {
          close();
          router.push('/communities');
        },
      },
      {
        id: 'nav-groups',
        title: 'Groups',
        subtitle: 'Multi-member discussion rooms and collectives',
        category: 'navigate',
        keywords: ['groups', 'rooms', 'teams'],
        icon: Layers,
        shortcut: ['G', 'G'],
        action: () => {
          close();
          router.push('/groups');
        },
      },
      {
        id: 'nav-people',
        title: 'People Directory',
        subtitle: 'Find members, search usernames, and connect',
        category: 'navigate',
        keywords: ['people', 'users', 'directory', 'find', 'search'],
        icon: Users,
        shortcut: ['G', 'P'],
        action: () => {
          close();
          router.push('/people');
        },
      },
      {
        id: 'nav-profile',
        title: 'Your Profile',
        subtitle: 'Manage your presence, display name, and bio',
        category: 'navigate',
        keywords: ['profile', 'account', 'avatar', 'status', 'me'],
        icon: User,
        action: () => {
          close();
          router.push('/profile');
        },
      },
      {
        id: 'nav-settings',
        title: 'Settings',
        subtitle: 'Appearance, notifications, accessibility, and privacy',
        category: 'navigate',
        keywords: ['settings', 'preferences', 'theme', 'config'],
        icon: Settings,
        shortcut: ['G', 'S'],
        action: () => {
          close();
          router.push('/settings');
        },
      },
      {
        id: 'nav-demo',
        title: 'Launch Interactive Demo',
        subtitle: 'Explore Nexus Moments, living profiles, and sample chats',
        category: 'navigate',
        keywords: ['demo', 'sample', 'preview', 'try'],
        icon: Sparkles,
        badge: 'Sandbox',
        badgeVariant: 'wine',
        action: () => {
          close();
          router.push('/demo');
        },
      }
    );
  }

  // ── 3. Quick Actions ─────────────────────────────────────────────────────────
  if (!isDemo) {
    commands.push(
      {
        id: 'action-new-chat',
        title: 'Start New Conversation',
        subtitle: 'Lookup a user and initiate a direct message',
        category: 'actions',
        keywords: ['new', 'chat', 'message', 'compose', 'start'],
        icon: Plus,
        shortcut: ['N'],
        action: () => {
          close();
          router.push('/people');
        },
      },
      {
        id: 'action-create-group',
        title: 'Create a Group',
        subtitle: 'Form a new discussion circle or team room',
        category: 'actions',
        keywords: ['create group', 'new group', 'room'],
        icon: Layers,
        action: () => {
          close();
          router.push('/groups?create=1');
        },
      }
    );
  }

  // ── 4. Preferences & Toggles (Active in all modes) ───────────────────────────
  if (updateAppearance) {
    const isDark = resolvedTheme === 'dark' || resolvedTheme === 'midnight-wine' || resolvedTheme === 'graphite';
    const nextTheme = isDark ? 'light' : 'dark';
    commands.push(
      {
        id: 'pref-toggle-theme',
        title: `Switch to ${isDark ? 'Porcelain Light' : 'Obsidian Dark'} Theme`,
        subtitle: `Currently using ${resolvedTheme} mode`,
        category: 'preferences',
        keywords: ['theme', 'dark', 'light', 'mode', 'color', 'appearance'],
        icon: isDark ? Sun : Moon,
        shortcut: ['T'],
        action: () => {
          close();
          updateAppearance({ theme: nextTheme });
        },
      },
      {
        id: 'pref-theme-midnight-wine',
        title: 'Theme: Midnight Wine',
        subtitle: 'Rich near-black surfaces with deep burgundy layering',
        category: 'preferences',
        keywords: ['theme', 'midnight wine', 'burgundy', 'dark', 'color'],
        icon: Sparkles,
        badge: resolvedTheme === 'midnight-wine' ? 'Active' : undefined,
        badgeVariant: resolvedTheme === 'midnight-wine' ? 'wine' : undefined,
        action: () => {
          close();
          updateAppearance({ theme: 'midnight-wine' });
        },
      },
      {
        id: 'pref-theme-arctic-porcelain',
        title: 'Theme: Arctic Porcelain',
        subtitle: 'Crisp cool-neutral light with architectural grey separation',
        category: 'preferences',
        keywords: ['theme', 'arctic', 'porcelain', 'light', 'white', 'cool'],
        icon: Sun,
        badge: resolvedTheme === 'arctic-porcelain' ? 'Active' : undefined,
        badgeVariant: resolvedTheme === 'arctic-porcelain' ? 'emerald' : undefined,
        action: () => {
          close();
          updateAppearance({ theme: 'arctic-porcelain' });
        },
      },
      {
        id: 'pref-theme-graphite',
        title: 'Theme: Graphite',
        subtitle: 'Balanced dark-grey surfaces with minimal restrained wine',
        category: 'preferences',
        keywords: ['theme', 'graphite', 'grey', 'dark', 'minimal'],
        icon: Laptop,
        badge: resolvedTheme === 'graphite' ? 'Active' : undefined,
        badgeVariant: resolvedTheme === 'graphite' ? 'wine' : undefined,
        action: () => {
          close();
          updateAppearance({ theme: 'graphite' });
        },
      }
    );
  }

  if (updateAccessibility && settings) {
    const isReduced = settings.accessibility.reduceMotion;
    commands.push({
      id: 'pref-toggle-reduced-motion',
      title: `${isReduced ? 'Disable' : 'Enable'} Reduced Motion`,
      subtitle: isReduced
        ? 'Allow subtle entrance transitions'
        : 'Minimize all UI animations and transitions',
      category: 'preferences',
      keywords: ['motion', 'animation', 'accessibility', 'reduced motion'],
      icon: Sliders,
      badge: isReduced ? 'Active' : undefined,
      badgeVariant: isReduced ? 'emerald' : undefined,
      action: () => {
        close();
        updateAccessibility({ reduceMotion: !isReduced });
      },
    });
  }

  if (updateNotifications && settings) {
    const isSound = settings.notifications.soundEnabled;
    commands.push({
      id: 'pref-toggle-sound',
      title: `${isSound ? 'Mute' : 'Enable'} Notification Sounds`,
      subtitle: isSound ? 'Play audio chime on incoming messages' : 'Audio sounds are muted',
      category: 'preferences',
      keywords: ['sound', 'audio', 'notifications', 'volume', 'chime', 'mute'],
      icon: isSound ? Volume2 : VolumeX,
      action: () => {
        close();
        updateNotifications({ soundEnabled: !isSound });
      },
    });
  }

  // ── 5. Isolated Demo Commands (Active ONLY on /demo) ──────────────────────────
  if (isDemo) {
    // Demo Navigation & Experience Features
    commands.push(
      {
        id: 'demo-nav-messages',
        title: 'Demo Messages',
        subtitle: 'View conversations with simulated fictional contacts',
        category: 'demo',
        keywords: ['demo', 'messages', 'contacts'],
        icon: MessageSquare,
        action: () => {
          close();
          onDemoSelectTab?.('messages');
        },
      },
      {
        id: 'demo-nav-discovery',
        title: 'Nexus Discovery Hub',
        subtitle: 'Interactive interconnected graph of people, stories & groups',
        category: 'demo',
        keywords: ['discovery', 'graph', 'explore', 'connected'],
        icon: Compass,
        badge: 'Interactive',
        badgeVariant: 'wine',
        action: () => {
          close();
          onDemoSelectTab?.('discovery');
        },
      },
      {
        id: 'demo-nav-communities',
        title: 'Demo Communities',
        subtitle: 'Explore simulated cultural and architectural spaces',
        category: 'demo',
        keywords: ['communities', 'salons', 'topics'],
        icon: Compass,
        action: () => {
          close();
          onDemoSelectTab?.('communities');
        },
      },
      {
        id: 'demo-nav-groups',
        title: 'Demo Groups',
        subtitle: 'Simulated multi-member group conversations',
        category: 'demo',
        keywords: ['groups', 'rooms', 'teams'],
        icon: Layers,
        action: () => {
          close();
          onDemoSelectTab?.('groups');
        },
      },
      {
        id: 'demo-nav-pulse',
        title: 'Demo Pulse Hub',
        subtitle: 'Simulated activity analytics, engagement signals & status',
        category: 'demo',
        keywords: ['pulse', 'activity', 'analytics', 'status', 'signals'],
        icon: Activity,
        badge: 'Analytics',
        badgeVariant: 'wine',
        action: () => {
          close();
          onDemoSelectTab?.('pulse');
        },
      },
      {
        id: 'demo-nav-echoes',
        title: 'Demo Echoes Hub',
        subtitle: 'View bookmarked insights, quotes & saved thoughts',
        category: 'demo',
        keywords: ['echoes', 'saved', 'bookmarks', 'quotes', 'notes'],
        icon: Bookmark,
        badge: 'Bookmarks',
        badgeVariant: 'wine',
        action: () => {
          close();
          onDemoSelectTab?.('echoes');
        },
      },
      {
        id: 'demo-nav-settings',
        title: 'Demo Settings & Preferences',
        subtitle: 'Customize themes, typography, sounds & accessibility',
        category: 'demo',
        keywords: ['settings', 'preferences', 'themes', 'appearance', 'sound'],
        icon: Settings,
        action: () => {
          close();
          onDemoSelectTab?.('settings');
        },
      },
      {
        id: 'demo-exit',
        title: 'Exit Demo Mode',
        subtitle: 'Return to welcome page or authenticate with a real account',
        category: 'demo',
        keywords: ['exit', 'leave', 'sign in', 'login'],
        icon: LogOut,
        action: () => {
          close();
          router.push('/');
        },
      }
    );

    // Register all 6 Demo Contacts directly into commands for instant jump
    DEMO_CONTACTS.forEach((contact) => {
      commands.push({
        id: `demo-contact-${contact.id}`,
        title: contact.name,
        subtitle: `${contact.handle} · ${contact.subtitle || contact.statusText}`,
        category: 'conversations',
        keywords: [contact.name, contact.handle, contact.subtitle || '', 'chat', 'contact'],
        initials: contact.initials,
        badge: contact.isCreator ? 'Creator' : contact.status === 'online' ? 'Online' : undefined,
        badgeVariant: contact.isCreator ? 'wine' : 'emerald',
        action: () => {
          close();
          onDemoSelectContact?.(contact.id);
          onDemoSelectTab?.('messages');
        },
      });

      // Add Living Profile command for each contact
      commands.push({
        id: `demo-profile-${contact.id}`,
        title: `View ${contact.name}'s Living Profile`,
        subtitle: `Explore ${contact.name}'s creative universe, bio, and artifacts`,
        category: 'people',
        keywords: [contact.name, 'profile', 'living profile', 'bio'],
        initials: contact.initials,
        action: () => {
          close();
          onDemoOpenLivingProfile?.(contact.id);
        },
      });
    });

    // Register Demo Groups
    DEMO_GROUPS.forEach((group) => {
      commands.push({
        id: `demo-group-${group.id}`,
        title: group.name,
        subtitle: `${group.memberCount} members · ${group.description}`,
        category: 'conversations',
        keywords: [group.name, group.description, 'group'],
        icon: Layers,
        badge: 'Group',
        badgeVariant: 'default',
        action: () => {
          close();
          onDemoSelectTab?.('groups');
        },
      });
    });
  }

  return commands;
}

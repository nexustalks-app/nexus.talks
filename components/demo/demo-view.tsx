'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Compass,
  Layers,
  Search,
  Send,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Check,
  Sparkles,
  Info,
  Clock,
  Users,
  Reply,
  Pencil,
  Trash2,
  X,
  Bookmark,
  Activity,
  Lock,
  ShieldCheck,
  Command,
  Globe,
  Palette,
  Settings,
  Plus,
  LogOut,
  SquarePen,
  Phone,
  Video,
  Pin,
  PinOff,
  Sun,
  Moon,
  Paperclip,
  Calendar,
  Mic,
  Play,
  Pause,
  ChevronLeft,
  ArrowUp,
  FileText,
  Copy,
} from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import type { ThemeMode } from '@/lib/settings/settings-types';
import { generateAasifReply } from '@/lib/demo/aasif-brain';
import { EchoNoteModal } from '@/components/echoes/echo-note-modal';
import { AppearanceSection } from '@/components/settings/sections/appearance-section';
import { CURATED_REACTIONS } from '@/lib/utils/reactions';
import {
  DEMO_CONTACTS,
  DEMO_COMMUNITIES,
  DEMO_GROUPS,
  DEMO_STATUS_PROFILES,
  getLivingProfileByContactId,
  type DemoContact,
  type DemoGroup,
  type DemoStatusProfile,
  type DemoLivingProfile,
} from './demo-data';
import { DemoStatusStrip } from './demo-status-strip';
import { DemoStatusViewer } from './demo-status-viewer';
import { DemoActionSheet } from './demo-action-sheet';
import { CallModal, type CallType } from '@/components/call/call-modal';
import { NexusAvatar3D } from '@/components/user/nexus-avatar-3d';
import { UserAvatar } from '@/components/user/user-avatar';
import { getDeterministicDemoAvatar } from '@/lib/avatar/avatar-collection';
import { DemoLivingProfileView } from './demo-living-profile';
import { DemoDiscoveryView } from './demo-discovery';
import { type ExplorerProgress, getDiscoveryConnections } from './demo-discovery-graph';
import { useRegisterCommands } from '@/lib/command/command-context';
import { NexusMark } from '@/components/ui/nexus-mark';
import { EmptyConversation } from '@/components/conversation/empty-conversation';
import { ConversationInfoCenter } from '@/components/conversation/conversation-info-center';
import {
  type ConversationThemePreference,
  DEFAULT_THEME_PREFERENCE,
  loadChatThemePreference,
  saveChatThemePreference,
  removeChatThemePreference,
  getChatThemeStyles,
} from '@/lib/theme/chat-theme';
import type { Message } from '@/types/database';
import { cn } from '@/lib/utils/cn';

type DemoNavTab = 'messages' | 'pulse' | 'echoes' | 'discovery' | 'communities' | 'groups' | 'settings';

export interface DemoEcho {
  id: string;
  messageId: string;
  contactId: string;
  contactName: string;
  contactInitials: string;
  avatarColor: string;
  textColor: string;
  content: string;
  note: string | null;
  timestamp: string;
  savedAt: string;
}

const DEMO_PINNED_STORAGE_KEY = 'nexus_demo_pinned_contacts';

function getDemoPinnedStorage(): Record<string, { isPinned: boolean; pinnedAt: string | null }> {
  if (typeof window === 'undefined') {
    return { 'contact-aasif': { isPinned: true, pinnedAt: '2026-10-27T10:00:00Z' } };
  }
  try {
    const raw = localStorage.getItem(DEMO_PINNED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { 'contact-aasif': { isPinned: true, pinnedAt: '2026-10-27T10:00:00Z' } };
}

function saveDemoPinnedStorage(map: Record<string, { isPinned: boolean; pinnedAt: string | null }>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_PINNED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function sortDemoContacts(list: DemoContact[]): DemoContact[] {
  return [...list].sort((a, b) => {
    const aPinned = Boolean(a.isPinned);
    const bPinned = Boolean(b.isPinned);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    if (aPinned && bPinned) {
      if (a.pinnedAt && b.pinnedAt) {
        const diff = new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
        if (diff !== 0) return diff;
      }
    }
    return 0;
  });
}

interface DemoContactRowProps {
  contact: DemoContact;
  isSelected: boolean;
  isTyping: boolean;
  onSelect: () => void;
  onTogglePin: (id: string) => void;
  onOpenContextMenu?: (contactId: string, x: number, y: number) => void;
  searchQuery: string;
}

function DemoContactRow({
  contact,
  isSelected,
  isTyping,
  onSelect,
  onTogglePin,
  onOpenContextMenu,
  searchQuery,
}: DemoContactRowProps) {
  const hasUnread = contact.unreadCount > 0;
  const isSearching = searchQuery.trim().length > 0;
  const showHandle = isSearching;
  const cleanSnippet = contact.lastMessageSnippet.replace(/^@[\w.-]+(?:\s*:\s*|\s*·\s*|\s+)/, '');

  const lastMsg = contact.conversation[contact.conversation.length - 1];
  const lastMsgIsOwn = lastMsg ? lastMsg.isOwn : false;

  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeOffsetRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSwipingRef = useRef(false);
  const isScrollingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const triggerPin = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
    onTogglePin(contact.id);
  }, [contact.id, onTogglePin]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    isSwipingRef.current = false;
    isScrollingRef.current = false;

    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (!isScrollingRef.current && touchStartRef.current) {
        suppressClickRef.current = true;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(40);
          } catch {
            // ignore
          }
        }
        if (onOpenContextMenu) {
          onOpenContextMenu(contact.id, touchStartRef.current.x, touchStartRef.current.y);
        } else {
          triggerPin();
        }
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 300);
      }
    }, 480);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isScrollingRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!isSwipingRef.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        isScrollingRef.current = true;
        clearLongPress();
        swipeOffsetRef.current = 0;
        setSwipeOffset(0);
        return;
      }
      if (dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        isSwipingRef.current = true;
        clearLongPress();
      }
    }

    if (isSwipingRef.current && dx > 0) {
      const clamped = Math.min(dx * 0.75, 92);
      swipeOffsetRef.current = clamped;
      setSwipeOffset(clamped);
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    if (isSwipingRef.current) {
      suppressClickRef.current = true;
      if (swipeOffsetRef.current >= 45) {
        triggerPin();
      }
      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
      isSwipingRef.current = false;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
    } else {
      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
    }
    touchStartRef.current = null;
  };

  const handleTouchCancel = () => {
    clearLongPress();
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    isSwipingRef.current = false;
    isScrollingRef.current = false;
    touchStartRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelect();
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenContextMenu?.(contact.id, e.clientX, e.clientY);
      }}
    >
      {/* Swipe reveal background */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 flex items-center px-4 transition-opacity duration-150',
          'bg-wine/15 dark:bg-wine/30 border-l-[3px] border-l-wine text-wine dark:text-[#F3B3C2]',
          swipeOffset > 8 ? 'opacity-100' : 'opacity-0'
        )}
        style={{ width: `${Math.max(swipeOffset + 8, 70)}px` }}
      >
        <div className="flex items-center gap-1.5 font-semibold text-xs">
          {contact.isPinned ? (
            <>
              <PinOff className="h-4 w-4" />
              <span>Unpin</span>
            </>
          ) : (
            <>
              <Pin className="h-4 w-4 fill-wine/20 dark:fill-[#F3B3C2]/20" />
              <span>Pin</span>
            </>
          )}
        </div>
      </div>

      <div
        data-contact-id={contact.id}
        data-is-pinned={contact.isPinned ? 'true' : undefined}
        className={cn(
          'group relative w-full text-left rounded-2xl px-3.5 py-2.5 flex items-center gap-3.5 transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out select-none',
          isSelected
            ? 'nx-contact-row-active !scale-[1.01]'
            : contact.isPinned
            ? 'bg-wine/[0.03] dark:bg-wine/[0.08] hover:bg-wine/[0.06] dark:hover:bg-wine/[0.14] border-l-2 border-l-wine/70 dark:border-l-[#D48B9B]/60'
            : 'hover:bg-white/60 dark:hover:bg-white/5 hover:shadow-2xs'
        )}
        style={{
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: swipeOffset > 0 ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Active row marker */}
        {isSelected && (
          <span
            aria-hidden="true"
            className="absolute inset-y-2.5 left-1 w-1 rounded-full bg-gradient-to-b from-[#8E2E4A] to-[#631D35] dark:from-[#F3B3C2] dark:to-wine shadow-xs shadow-wine/40 transition-all duration-200"
          />
        )}
        {/* Full-Row Contact Selection Button (Accessible Primary Action) */}
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'p' || e.key === 'P') {
              e.preventDefault();
              triggerPin();
            }
          }}
          aria-label={`${contact.name}, ${contact.isPinned ? 'pinned conversation, ' : ''}${isTyping ? 'typing now, ' : cleanSnippet ? `${lastMsgIsOwn ? 'you: ' : ''}${cleanSnippet}` : ''}`}
          className="absolute inset-0 z-0 w-full h-full rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-wine dark:focus-visible:ring-[#F3B3C2] cursor-pointer"
        />

        {/* Avatar with status indicator overlapping lower-right edge */}
        <div className="relative shrink-0 pointer-events-none z-10" aria-hidden="true">
          <UserAvatar
            id={contact.id}
            display_name={contact.name}
            avatar_url={contact.avatarUrl}
            size="md"
            className="!h-11 !w-11"
            isPinned={contact.isPinned}
          />
          <span
            className={cn(
              'absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] z-10',
              contact.status === 'online'
                ? 'bg-emerald-600'
                : contact.status === 'away'
                ? 'bg-amber-500'
                : 'bg-stone-strong'
            )}
          />
        </div>

        {/* Info (Middle column) */}
        <div className="min-w-0 flex-1 pointer-events-none z-10" aria-hidden="true">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={cn(
                'text-[13.5px] truncate',
                hasUnread
                  ? 'font-semibold text-[#1A1A1A] dark:text-[#F5F2F4]'
                  : 'font-medium text-charcoal/90 dark:text-[#E8E2E6]'
              )}
            >
              {contact.name}
            </span>
          </div>

          {/* Subtitle / Preview / Live typing */}
          {isTyping ? (
            <div
              className="flex items-center gap-1.5 text-wine dark:text-[#E2A6B3] font-medium text-[12px] sm:text-[12.5px] mt-0.5 leading-snug nx-fade-in"
              aria-live="polite"
            >
              <span className="italic font-medium">typing</span>
              <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot"
                  style={{ animationDelay: '180ms' }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot"
                  style={{ animationDelay: '360ms' }}
                />
              </span>
            </div>
          ) : showHandle ? (
            <div className="flex items-center gap-1 mt-0.5 text-[11.5px] truncate">
              <span className="font-mono text-[11px] text-wine dark:text-[#E2A6B3] shrink-0">
                @{contact.handle}
              </span>
              <span className="text-muted/50">&middot;</span>
              <p className="text-[#71717A] dark:text-[#A1A1AA] font-normal truncate">
                {cleanSnippet}
              </p>
            </div>
          ) : (
            <p
              className={cn(
                'truncate text-[12px] sm:text-[12.5px] mt-0.5 leading-snug',
                hasUnread
                  ? 'text-[#1A1A1A] dark:text-[#EDEDED] font-medium sm:font-semibold'
                  : 'text-[#71717A] dark:text-[#A1A1AA] font-normal'
              )}
            >
              {lastMsgIsOwn && (
                <span className="font-medium text-muted-faint dark:text-[#887882] mr-1 select-none">
                  You:
                </span>
              )}
              {cleanSnippet}
            </p>
          )}
        </div>

        {/* Right Metadata Column */}
        <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5 pl-2 min-w-[56px] z-10">
          {/* Line 1: Pin icon + Timestamp */}
          <div className="h-5 flex items-center justify-end gap-1.5 pointer-events-none" aria-hidden="true">
            {contact.isPinned && (
              <Pin
                className="h-3 w-3 text-wine dark:text-[#F3B3C2] shrink-0 fill-wine/25 dark:fill-[#F3B3C2]/25"
                aria-label="Pinned conversation"
              />
            )}
            <span
              className={cn(
                'text-[11px] sm:text-[11.5px] tabular-nums font-mono text-right',
                hasUnread
                  ? 'font-semibold text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              {contact.conversation.length === 0 ? 'Online' : contact.lastMessageTime}
            </span>
          </div>

          {/* Line 2: Unread badge (Hover-to-pin button removed in favor of right-click / press-and-hold context menu) */}
          <div className="h-5 flex items-center justify-end gap-1.5">
            {hasUnread && (
              <span className="pointer-events-none flex h-4.5 min-w-[19px] items-center justify-center rounded-full bg-wine px-1.5 text-[10px] font-bold text-white shadow-2xs tabular-nums" aria-hidden="true">
                {contact.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DemoView() {
  const { settings, updateAppearance, resolvedTheme, isDarkTheme } = useSettings();
  const [activeTab, setActiveTab] = useState<DemoNavTab>('messages');

  // Contacts state (local, isolated with pinning persistence)
  // Deterministic default on initial render for server/client parity
  const [contacts, setContacts] = useState<DemoContact[]>(() => {
    const defaultPinMap: Record<string, { isPinned: boolean; pinnedAt: string | null }> = {
      'contact-aasif': { isPinned: true, pinnedAt: '2026-10-27T10:00:00Z' },
    };
    const initial = DEMO_CONTACTS.map((c) => {
      const p = defaultPinMap[c.id];
      const isPinned = p !== undefined ? p.isPinned : Boolean(c.isPinned);
      const pinnedAt = p !== undefined ? p.pinnedAt : (c.pinnedAt || (isPinned ? '2026-10-27T10:00:00Z' : null));
      return {
        ...c,
        isPinned,
        pinnedAt,
      };
    });
    return sortDemoContacts(initial);
  });

  // Rehydrate persisted pins from localStorage after initial hydration
  useEffect(() => {
    const pinMap = getDemoPinnedStorage();
    setContacts((prev) => {
      const updated = prev.map((c) => {
        const p = pinMap[c.id];
        const isPinned = p !== undefined ? p.isPinned : Boolean(c.isPinned);
        const pinnedAt = p !== undefined ? p.pinnedAt : (c.pinnedAt || (isPinned ? '2026-10-27T10:00:00Z' : null));
        return {
          ...c,
          isPinned,
          pinnedAt,
        };
      });
      return sortDemoContacts(updated);
    });
  }, []);

  const handleTogglePinContact = useCallback((contactId: string) => {
    setContacts((prev) => {
      const next = prev.map((c) => {
        if (c.id !== contactId) return c;
        const nextPinned = !c.isPinned;
        return {
          ...c,
          isPinned: nextPinned,
          pinnedAt: nextPinned ? new Date().toISOString() : null,
        };
      });
      const sorted = sortDemoContacts(next);
      const pinMap: Record<string, { isPinned: boolean; pinnedAt: string | null }> = {};
      sorted.forEach((c) => {
        if (c.isPinned) {
          pinMap[c.id] = { isPinned: true, pinnedAt: c.pinnedAt || null };
        }
      });
      saveDemoPinnedStorage(pinMap);
      return sorted;
    });
  }, []);

  // Context Menu state (right-click / press-and-hold on contacts)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; contactId: string } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu]);

  // Deterministic contact selection on initial render
  const [selectedContactId, setSelectedContactId] = useState<string>('contact-aasif');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileInChat, setMobileInChat] = useState<boolean>(false);
  const [demoCreateSheetOpen, setDemoCreateSheetOpen] = useState(false);
  const [aasifGreetingSent, setAasifGreetingSent] = useState(false);

  // Call simulation state
  const [demoCallType, setDemoCallType] = useState<CallType | null>(null);

  // Sync URL search params after initial mount without causing hydration mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const c = params.get('contact');
    if (c) {
      setSelectedContactId(c);
      setMobileInChat(true);
    } else if (params.get('chat') === 'true') {
      setMobileInChat(true);
    }
    const call = params.get('call');
    if (call === 'video' || call === 'voice') {
      setDemoCallType(call as CallType);
    }
  }, []);

  // Demo Echoes state (100% in-memory, deterministic initial timestamps)
  const [demoEchoes, setDemoEchoes] = useState<DemoEcho[]>([
    {
      id: 'demo-echo-1',
      messageId: 'msg-aasif-1',
      contactId: 'contact-aasif',
      contactName: 'Mr Aasif',
      contactInitials: 'A',
      avatarColor: '#542C38',
      textColor: '#FFFFFF',
      content: 'Welcome to Nexus.talks. I built this space with a Wine & Porcelain design identity—warm, editorial, and human.',
      note: 'Founding design thesis. Core brand identity reference.',
      timestamp: '10:00 AM',
      savedAt: '2026-10-28T10:00:00.000Z',
    },
    {
      id: 'demo-echo-2',
      messageId: 'msg-elena-1',
      contactId: 'contact-elena',
      contactName: 'Elena Rostova',
      contactInitials: 'ER',
      avatarColor: '#78350F',
      textColor: '#FEF3C7',
      content: 'The typography rhythm in the chat view feels deliberate. The serif headers ground the conversation.',
      note: 'Elena typography feedback note.',
      timestamp: '10:15 AM',
      savedAt: '2026-10-28T10:15:00.000Z',
    },
  ]);
  const [demoEchoModalTarget, setDemoEchoModalTarget] = useState<{
    id: string;
    content: string;
    senderName?: string;
    createdAt?: string;
  } | null>(null);

  // Groups state (local, isolated)
  const [groups, setGroups] = useState<DemoGroup[]>(DEMO_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('group-night-owls');
  const [mobileInGroup, setMobileInGroup] = useState(false);

  // Nexus Moments (Demo Statuses) state
  const [selectedStatusProfileId, setSelectedStatusProfileId] = useState<string | null>(null);
  const [viewedStatusIds, setViewedStatusIds] = useState<Set<string>>(new Set());

  // Living Profiles (Phase 9) state
  const [selectedLivingContactId, setSelectedLivingContactId] = useState<string | null>(null);

  // Explorer Journey Progress (Phase 10, deterministic initial state for server/client parity)
  const [explorerProgress, setExplorerProgress] = useState<ExplorerProgress>({
    visitedContacts: ['contact-aasif'],
    openedStoryCount: 0,
    viewedLivingProfileCount: 0,
    enteredGroupCount: 0,
    visitedCreatorCorner: false,
    discoveredSecretNote: false,
  });

  // Rehydrate explorer progress from localStorage after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('nexus_discovery_progress');
      if (saved) {
        setExplorerProgress(JSON.parse(saved));
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nexus_discovery_progress', JSON.stringify(explorerProgress));
      } catch {
        // ignore
      }
    }
  }, [explorerProgress]);

  const handleOpenLivingProfile = (contactId: string) => {
    setExplorerProgress((prev) => ({
      ...prev,
      viewedLivingProfileCount: prev.viewedLivingProfileCount + 1,
      visitedContacts: Array.from(new Set([...prev.visitedContacts, contactId])),
    }));
    setSelectedLivingContactId(contactId);
  };

  const handleCloseLivingProfile = () => {
    setSelectedLivingContactId(null);
  };

  const handleStartConversationFromProfile = (contactId: string) => {
    setSelectedLivingContactId(null);
    setActiveTab('messages');
    handleSelectContact(contactId);
  };

  const handleOpenStoriesFromProfile = (statusProfileId: string) => {
    setExplorerProgress((prev) => ({
      ...prev,
      openedStoryCount: prev.openedStoryCount + 1,
    }));
    setSelectedLivingContactId(null);
    setSelectedStatusProfileId(statusProfileId);
  };

  const handleSelectStatusProfile = (profileId: string) => {
    setExplorerProgress((prev) => ({
      ...prev,
      openedStoryCount: prev.openedStoryCount + 1,
    }));
    setSelectedStatusProfileId(profileId);
  };

  const handleMarkProfileViewed = useCallback((profileId: string) => {
    setViewedStatusIds((prev) => {
      const next = new Set(prev);
      next.add(profileId);
      return next;
    });
  }, []);

  // Composer state
  const [inputMessage, setInputMessage] = useState('');
  const [isTypingSimulated, setIsTypingSimulated] = useState(false);
  const [simulatedFeedback, setSimulatedFeedback] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [activeMobileActionMsgId, setActiveMobileActionMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const demoScrollRef = useRef<HTMLDivElement>(null);
  const isDemoAtBottomRef = useRef(true);
  const [hasDemoNewMessagesBelow, setHasDemoNewMessagesBelow] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);
  const [mobileActionPlaceBelow, setMobileActionPlaceBelow] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyText = useCallback(async (content: string, msgId: string) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId(null), 2000);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const draftBackupRef = useRef<string>('');

  const activeContact = contacts.find((c) => c.id === selectedContactId) || contacts[0];
  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  const prevDemoMessagesCountRef = useRef(activeContact.conversation.length);
  const prevDemoLastMessageIdRef = useRef(
    activeContact.conversation[activeContact.conversation.length - 1]?.id
  );
  const activeContactIdRef = useRef(activeContact.id);

  // ── Conversation Experience 2.0: Personal Themes & Conversation Info Center ──
  const DEMO_INFO_KEY = 'nx_demo_info_center_open';
  const [demoInfoOpen, setDemoInfoOpen] = useState(false);
  const [mobileDemoInfoOpen, setMobileDemoInfoOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
        const saved = localStorage.getItem(DEMO_INFO_KEY);
        if (saved !== null) {
          setDemoInfoOpen(saved === 'true');
        } else {
          setDemoInfoOpen(true);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleToggleDemoInfo = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
      setDemoInfoOpen((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(DEMO_INFO_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } else {
      setMobileDemoInfoOpen((prev) => !prev);
    }
  }, []);

  const [demoThemePref, setDemoThemePref] = useState<ConversationThemePreference>(DEFAULT_THEME_PREFERENCE);

  useEffect(() => {
    if (activeContact?.id) {
      setDemoThemePref(loadChatThemePreference(activeContact.id, null, true));
    }
  }, [activeContact?.id]);

  const handleApplyDemoTheme = useCallback((newPref: ConversationThemePreference) => {
    setDemoThemePref(newPref);
    if (activeContact?.id) {
      saveChatThemePreference(activeContact.id, newPref, null, true);
    }
  }, [activeContact?.id]);

  const handleResetDemoTheme = useCallback(() => {
    setDemoThemePref(DEFAULT_THEME_PREFERENCE);
    if (activeContact?.id) {
      removeChatThemePreference(activeContact.id, null, true);
    }
  }, [activeContact?.id]);

  const demoChatThemeStyles = useMemo(
    () => getChatThemeStyles(demoThemePref, isDarkTheme),
    [demoThemePref, isDarkTheme]
  );

  const [demoMutedMap, setDemoMutedMap] = useState<Record<string, boolean>>({});
  const isDemoContactMuted = Boolean(demoMutedMap[activeContact.id]);
  const handleToggleDemoMute = useCallback(() => {
    setDemoMutedMap((prev) => ({
      ...prev,
      [activeContact.id]: !prev[activeContact.id],
    }));
  }, [activeContact.id]);

  const adaptedDemoMessages: Message[] = useMemo(() => {
    return activeContact.conversation.map((msg) => ({
      id: msg.id,
      conversation_id: activeContact.id,
      sender_id: msg.isOwn ? 'demo-user' : activeContact.id,
      content: msg.isImage && msg.imageUrl ? msg.imageUrl : msg.content,
      type: (msg.isImage ? 'image' : msg.content.endsWith('.pdf') ? 'file' : 'text') as 'image' | 'file' | 'text',
      reply_to_id: msg.replyTo ? msg.replyTo.id : null,
      edited_at: msg.editedAt || null,
      deleted_at: msg.isDeleted ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }, [activeContact.id, activeContact.conversation]);

  const handleDemoScroll = useCallback(() => {
    setActiveMobileActionMsgId(null);
    const el = demoScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 100;
    isDemoAtBottomRef.current = isNearBottom;
    if (isNearBottom) {
      setHasDemoNewMessagesBelow(false);
    }
  }, []);

  const handleMessageTouchStart = useCallback((msgId: string, e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressActiveRef.current = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(35);
        } catch {
          // ignore
        }
      }
      const el = document.getElementById(`demo-msg-${msgId}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setMobileActionPlaceBelow(rect.top < 130);
      }
      setActiveMobileActionMsgId(msgId);
    }, 440);
  }, []);

  const handleMessageTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    if (dx > 9 || dy > 9) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleMessageTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressActiveRef.current) {
      e.preventDefault();
    }
  }, []);

  const handleMessageTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressActiveRef.current = false;
  }, []);

  const handleMessageContextMenu = useCallback((msgId: string, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = document.getElementById(`demo-msg-${msgId}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setMobileActionPlaceBelow(rect.top < 130);
    }
    setActiveMobileActionMsgId((curr) => (curr === msgId ? null : msgId));
  }, []);

  useEffect(() => {
    const el = demoScrollRef.current;
    if (!el) return;

    // Contact switched: jump to bottom instantly, reset tracking
    if (activeContactIdRef.current !== activeContact.id) {
      activeContactIdRef.current = activeContact.id;
      prevDemoMessagesCountRef.current = activeContact.conversation.length;
      prevDemoLastMessageIdRef.current =
        activeContact.conversation[activeContact.conversation.length - 1]?.id;
      setHasDemoNewMessagesBelow(false);
      isDemoAtBottomRef.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }

    const prevCount = prevDemoMessagesCountRef.current;
    const prevLastId = prevDemoLastMessageIdRef.current;
    const lastMessage = activeContact.conversation[activeContact.conversation.length - 1];
    const lastId = lastMessage?.id;
    const countIncreased = activeContact.conversation.length > prevCount;
    const isNewMessageAppended = countIncreased && lastId !== prevLastId;
    const isOwnLast = lastMessage?.isOwn;

    prevDemoMessagesCountRef.current = activeContact.conversation.length;
    prevDemoLastMessageIdRef.current = lastId;

    if (isNewMessageAppended) {
      if (isOwnLast) {
        // User sent message: always follow along immediately
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        setHasDemoNewMessagesBelow(false);
        isDemoAtBottomRef.current = true;
        return;
      }

      // Simulated incoming message:
      if (isDemoAtBottomRef.current) {
        // User is at bottom: follow along smoothly
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        setHasDemoNewMessagesBelow(false);
        return;
      }

      // User is reading history: PRESERVE SCROLL POSITION! Show affordance pill.
      setHasDemoNewMessagesBelow(true);
      return;
    }

    if (isTypingSimulated && isDemoAtBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [activeContact.id, activeContact.conversation, isTypingSimulated]);

  const handleStartEdit = useCallback((msg: { id: string; content: string }) => {
    draftBackupRef.current = inputMessage;
    setEditingMsg(msg);
    setReplyingTo(null);
    setInputMessage(msg.content);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [inputMessage]);

  const handleCancelEdit = useCallback(() => {
    setInputMessage(draftBackupRef.current);
    draftBackupRef.current = '';
    setEditingMsg(null);
  }, []);

  const handleConfirmDelete = useCallback((msgId: string) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== selectedContactId) return c;
        const updatedConvo = c.conversation
          .filter((m) => m.id !== msgId)
          .map((m) =>
            m.replyTo?.id === msgId
              ? {
                  ...m,
                  replyTo: {
                    ...m.replyTo,
                    content: 'Original message was deleted',
                    isDeleted: true,
                  },
                }
              : m
          );
        return { ...c, conversation: updatedConvo };
      })
    );

    if (editingMsg?.id === msgId) {
      handleCancelEdit();
    }
    if (replyingTo?.id === msgId) {
      setReplyingTo(null);
    }
    setDeletingMsgId(null);
    setSimulatedFeedback('Message deleted locally · Zero network requests');
    setTimeout(() => setSimulatedFeedback(null), 3000);
  }, [selectedContactId, editingMsg, replyingTo, handleCancelEdit]);

  const handleToggleReaction = useCallback((msgId: string, emoji: string) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== selectedContactId) return c;
        const updatedConvo = c.conversation.map((msg) => {
          if (msg.id !== msgId) return msg;

          const currentReactions = msg.reactions || [];
          const existingUserReaction = currentReactions.find((r) => r.hasReacted);

          let nextReactions = [...currentReactions];

          if (existingUserReaction && existingUserReaction.emoji === emoji) {
            // Toggling off the same emoji
            nextReactions = nextReactions
              .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, hasReacted: false } : r))
              .filter((r) => r.count > 0);
          } else if (existingUserReaction) {
            // Switching emoji: decrement old, increment/add new
            nextReactions = nextReactions
              .map((r) => {
                if (r.emoji === existingUserReaction.emoji) {
                  return { ...r, count: r.count - 1, hasReacted: false };
                }
                if (r.emoji === emoji) {
                  return { ...r, count: r.count + 1, hasReacted: true };
                }
                return r;
              })
              .filter((r) => r.count > 0);

            if (!nextReactions.some((r) => r.emoji === emoji)) {
              nextReactions.push({ emoji, count: 1, hasReacted: true });
            }
          } else {
            // Adding first reaction
            const existingEmoji = nextReactions.find((r) => r.emoji === emoji);
            if (existingEmoji) {
              nextReactions = nextReactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true } : r
              );
            } else {
              nextReactions.push({ emoji, count: 1, hasReacted: true });
            }
          }

          return { ...msg, reactions: nextReactions };
        });

        return { ...c, conversation: updatedConvo };
      })
    );
  }, [selectedContactId]);

  const handleJumpToMessage = useCallback((targetId: string) => {
    const el = document.getElementById(`demo-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetId);
      setTimeout(() => {
        setHighlightedMsgId((curr) => (curr === targetId ? null : curr));
      }, 1800);
    }
  }, []);

  const handleSaveDemoEcho = useCallback((note: string) => {
    if (!demoEchoModalTarget) return;
    const activeContact = contacts.find((c) => c.id === selectedContactId);

    setDemoEchoes((prev) => {
      const existingIndex = prev.findIndex((e) => e.messageId === demoEchoModalTarget.id);
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          note: note.trim() || null,
        };
        return next;
      }
      return [
        {
          id: `demo-echo-${Date.now()}`,
          messageId: demoEchoModalTarget.id,
          contactId: selectedContactId,
          contactName: demoEchoModalTarget.senderName || activeContact?.name || 'Contact',
          contactInitials: activeContact?.initials || '?',
          avatarColor: activeContact?.avatarColor || '#542C38',
          textColor: activeContact?.textColor || '#FFFFFF',
          content: demoEchoModalTarget.content,
          note: note.trim() || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    setSimulatedFeedback('Saved to Demo Echoes · 100% in-memory');
    setTimeout(() => setSimulatedFeedback(null), 3000);
    setDemoEchoModalTarget(null);
  }, [demoEchoModalTarget, contacts, selectedContactId]);

  const handleUnsaveDemoEcho = useCallback(() => {
    if (!demoEchoModalTarget) return;
    setDemoEchoes((prev) => prev.filter((e) => e.messageId !== demoEchoModalTarget.id));
    setSimulatedFeedback('Unsaved from Demo Echoes · 100% in-memory');
    setTimeout(() => setSimulatedFeedback(null), 3000);
    setDemoEchoModalTarget(null);
  }, [demoEchoModalTarget]);

  const filteredContacts = contacts.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.handle.toLowerCase().includes(query) ||
      (c.username && c.username.toLowerCase().includes(query)) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(query)) ||
      (c.statusText && c.statusText.toLowerCase().includes(query))
    );
  });

  const handleSelectContact = (id: string) => {
    setSelectedContactId(id);
    setMobileInChat(true);

    // Update exploration progress
    setExplorerProgress((prev) => ({
      ...prev,
      visitedContacts: Array.from(new Set([...prev.visitedContacts, id])),
    }));

    // Clear unread indicator locally for explored contact
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id);
    setMobileInGroup(true);

    // Update exploration progress
    setExplorerProgress((prev) => ({
      ...prev,
      enteredGroupCount: prev.enteredGroupCount + 1,
    }));
  };

  // Register dynamic demo commands for instant switching via Nexus Command
  useRegisterCommands(
    useMemo(
      () => [
        {
          id: 'demo-nav-discovery',
          title: 'Explore Nexus Discovery Hub',
          subtitle: 'Interactive interconnected graph of people, stories & groups',
          category: 'demo',
          keywords: ['discovery', 'graph', 'explore', 'map'],
          icon: Compass,
          badge: 'Hub',
          badgeVariant: 'wine',
          action: () => {
            setActiveTab('discovery');
            setSelectedLivingContactId(null);
            setSelectedStatusProfileId(null);
          },
        },
        ...DEMO_CONTACTS.map((c) => ({
          id: `demo-contact-${c.id}`,
          title: `Chat with ${c.name}`,
          subtitle: `${c.handle} · ${c.subtitle || c.statusText}`,
          category: 'conversations' as const,
          keywords: [c.name, c.handle, 'chat', 'message'],
          initials: c.initials,
          badge: c.isCreator ? 'Creator' : c.status === 'online' ? 'Online' : undefined,
          badgeVariant: (c.isCreator ? 'wine' : 'emerald') as 'wine' | 'emerald',
          action: () => {
            setActiveTab('messages');
            handleSelectContact(c.id);
            setSelectedLivingContactId(null);
            setSelectedStatusProfileId(null);
          },
        })),
        ...DEMO_CONTACTS.map((c) => ({
          id: `demo-profile-${c.id}`,
          title: `View ${c.name}'s Living Profile`,
          subtitle: `Inspect ${c.name}'s bio, philosophy, highlights, and artifacts`,
          category: 'people' as const,
          keywords: [c.name, c.handle, 'profile', 'bio', 'living profile'],
          initials: c.initials,
          action: () => {
            handleOpenLivingProfile(c.id);
          },
        })),
        ...DEMO_GROUPS.map((g) => ({
          id: `demo-group-${g.id}`,
          title: `Join ${g.name} Group Chat`,
          subtitle: `${g.memberCount} members · ${g.description}`,
          category: 'conversations' as const,
          keywords: [g.name, 'group', 'room'],
          icon: Layers,
          action: () => {
            setActiveTab('groups');
            handleSelectGroup(g.id);
          },
        })),
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    )
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    if (editingMsg) {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== activeContact.id) return c;
          const updatedConvo = c.conversation.map((m) => {
            if (m.id === editingMsg.id) {
              return { ...m, content: text, editedAt: 'Just now' };
            }
            if (m.replyTo?.id === editingMsg.id) {
              return { ...m, replyTo: { ...m.replyTo, content: text } };
            }
            return m;
          });
          return { ...c, conversation: updatedConvo };
        })
      );

      setInputMessage(draftBackupRef.current);
      draftBackupRef.current = '';
      setEditingMsg(null);
      setSimulatedFeedback('Message edited locally · Zero network requests');
      setTimeout(() => setSimulatedFeedback(null), 3000);
      return;
    }

    const newOwnMsg = {
      id: `local-${Date.now()}`,
      senderId: 'self' as const,
      senderName: 'You',
      senderInitials: 'ME',
      content: text,
      timestamp: 'Just now',
      isOwn: true,
      ...(replyingTo ? { replyTo: replyingTo } : {}),
    };

    setReplyingTo(null);

    // Update conversation locally
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === activeContact.id) {
          return {
            ...c,
            lastMessageSnippet: text,
            lastMessageTime: 'Just now',
            conversation: [...c.conversation, newOwnMsg],
          };
        }
        return c;
      })
    );

    setInputMessage('');
    inputRef.current?.focus();
    setSimulatedFeedback('Message added locally · Zero network requests');
    setTimeout(() => setSimulatedFeedback(null), 3000);

    // Determine simulated reply using Aasif Deterministic Intelligence Brain
    const targetContactId = activeContact.id;
    const targetContactName = activeContact.name;
    const targetContactInitials = activeContact.initials;
    const isAasif = targetContactId === 'contact-aasif';

    let replyText = `Thanks for testing! The Wine & Porcelain interface keeps the thread quiet and focused. Create an account to chat with real friends!`;
    let delayMs = 600;

    if (isAasif) {
      const recentTurns = activeContact.conversation.slice(-6).map((m) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
      }));
      const res = generateAasifReply(text, recentTurns);
      replyText = res.replyText;
      delayMs = res.delayMs;
    } else {
      const contactReplies: Record<string, string[]> = {
        'contact-elena': [
          `Received! The natural light study in the pavilion is coming along nicely. Let's touch base on the material palette soon.`,
          `Checked the layout. Notice how the ambient shadows adapt when switching between Porcelain and Obsidian!`,
        ],
        'contact-marcus': [
          `Looks sharp! Notice how the optical font hierarchy maintains strict clarity across devices.`,
          `Typography scale feels balanced. Plus Jakarta Sans gives the interface crisp precision.`,
        ],
        'contact-sophia': [
          `Got it! Playing the binaural rain track now while finishing these sound sketches.`,
          `The rhythm of the conversation matches the soundscape nicely. Quiet and grounded.`,
        ],
        'contact-julian': [
          `Thoughtful note. Sustaining real dialogue requires these quiet digital spaces.`,
          `Reading your note now. When there are no feeds demanding attention, conversations breathe better.`,
        ],
        'contact-amara': [
          `Sync confirmed! The local-first state model handles rapid updates seamlessly.`,
          `State reconciled locally. Notice the zero latency when submitting messages in the sandbox.`,
        ],
      };
      const variants = contactReplies[targetContactId] || [replyText];
      replyText = variants[Math.floor(Math.random() * variants.length)];
      delayMs = Math.min(2400, Math.max(1600, Math.round(replyText.length * 12 + 600)));
    }

    // Trigger simulated reply after dynamic typing delay
    setIsTypingSimulated(true);
    setTimeout(() => {
      setIsTypingSimulated(false);
      const simulatedReply = {
        id: `reply-${Date.now()}`,
        senderId: 'contact' as const,
        senderName: targetContactName,
        senderInitials: targetContactInitials,
        content: replyText,
        timestamp: 'Just now',
        isOwn: false,
      };

      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === targetContactId) {
            return {
              ...c,
              lastMessageSnippet: simulatedReply.content.split('\n')[0],
              lastMessageTime: 'Just now',
              conversation: [...c.conversation, simulatedReply],
            };
          }
          return c;
        })
      );
    }, delayMs);
  };

  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden nx-ambient-shell text-charcoal dark:text-[#EDE8EC] flex-col md:flex-row">
      {/* ── Desktop Floating Liquid Glass Dock (Demo) ─────────────────────── */}
      <aside
        aria-label="Demo Navigation Dock"
        className="hidden md:flex shrink-0 h-full w-[76px] min-w-[76px] py-4 pl-3.5 pr-2 items-center justify-center select-none z-30"
      >
        <div className="liquid-glass-dock-desktop relative flex flex-col items-center my-auto w-[58px] rounded-[29px] p-1.5 py-3 gap-1 shadow-2xl">
          {/* Top Zone: Brand Monogram Jewel, Quick Create Jewel & Command Launcher */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <Link
              href="/"
              title="Nexus.talks Home"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#802B43] via-[#631D35] to-[#451222] text-white font-serif font-black text-[15px] shadow-md shadow-wine/40 border border-white/35 transition-transform duration-150 hover:scale-105 active:scale-95"
            >
              N
            </Link>

            {/* Quick Create Action — Restrained tint & subtle outline */}
            <button
              type="button"
              onClick={() => setDemoCreateSheetOpen(true)}
              title="Start or discover (New chat, groups, communities)"
              aria-label="Start or discover"
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-wine/10 hover:bg-wine text-wine hover:text-white border border-wine/25 dark:bg-wine/20 dark:hover:bg-wine dark:text-[#F3B3C2] dark:hover:text-white dark:border-wine/35 shadow-xs transition-all duration-150 ease-out hover:scale-105 active:scale-95"
            >
              <Plus className="h-4.5 w-4.5 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.4} />
            </button>

            {/* Nexus Command Palette Launcher */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
              }}
              title="Nexus Command (Ctrl+K or ⌘K)"
              aria-label="Nexus Command (Ctrl+K or ⌘K)"
              className="group flex h-8.5 w-8.5 items-center justify-center rounded-lg text-muted hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 dark:hover:text-[#F3B3C2] transition-all duration-150 ease-out active:scale-90"
            >
              <Command className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Hairline Glass Separator */}
          <div className="w-7 h-px bg-[var(--chat-divider,#EBE3E0)] dark:bg-white/10 my-1.5 shrink-0" />

          {/* Nav Stack: Messages -> Pulse -> Echoes -> Communities -> Groups -> People (Users icon) -> Settings */}
          <nav aria-label="Demo Primary" className="flex flex-col items-center gap-1.5 w-full">
            {/* 1. Messages */}
            <button
              type="button"
              data-demo-tab="messages"
              onClick={() => {
                setActiveTab('messages');
                setMobileInChat(false);
              }}
              title="Messages"
              aria-label="Messages"
              aria-current={activeTab === 'messages' ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                activeTab === 'messages'
                  ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
              )}
            >
              <MessageSquare className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105" strokeWidth={activeTab === 'messages' ? 2.2 : 1.8} />
            </button>

            {/* 2. Pulse */}
            <button
              type="button"
              data-demo-tab="pulse"
              onClick={() => {
                setActiveTab('pulse');
                setMobileInChat(false);
              }}
              title="Pulse"
              aria-label="Pulse"
              aria-current={activeTab === 'pulse' ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                activeTab === 'pulse'
                  ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
              )}
            >
              <Activity className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105" strokeWidth={activeTab === 'pulse' ? 2.2 : 1.8} />
            </button>

            {/* 3. Echoes */}
            <button
              type="button"
              data-demo-tab="echoes"
              onClick={() => {
                setActiveTab('echoes');
                setMobileInChat(false);
              }}
              title="Echoes"
              aria-label="Echoes"
              aria-current={activeTab === 'echoes' ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                activeTab === 'echoes'
                  ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
              )}
            >
              <Bookmark className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105" strokeWidth={activeTab === 'echoes' ? 2.2 : 1.8} />
            </button>

            {/* 4. Communities */}
            <button
              type="button"
              data-demo-tab="communities"
              onClick={() => {
                setActiveTab('communities');
                setMobileInChat(false);
              }}
              title="Communities"
              aria-label="Communities"
              aria-current={activeTab === 'communities' ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                activeTab === 'communities'
                  ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
              )}
            >
              <Globe className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105" strokeWidth={activeTab === 'communities' ? 2.2 : 1.8} />
            </button>

            {/* 5. Groups */}
            <button
              type="button"
              data-demo-tab="groups"
              onClick={() => {
                setActiveTab('groups');
                setMobileInChat(false);
              }}
              title="Groups"
              aria-label="Groups"
              aria-current={activeTab === 'groups' ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                activeTab === 'groups'
                  ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
              )}
            >
              <Layers className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105" strokeWidth={activeTab === 'groups' ? 2.2 : 1.8} />
            </button>

            {/* 6. People (Users icon) */}
            <button
              type="button"
              data-demo-tab="discovery"
              onClick={() => {
                setActiveTab('discovery');
                setMobileInChat(false);
              }}
              title="People"
              aria-label="People"
              aria-current={activeTab === 'discovery' ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                activeTab === 'discovery'
                  ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
              )}
            >
              <Users className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105" strokeWidth={activeTab === 'discovery' ? 2.2 : 1.8} />
            </button>

            {/* 7. Settings */}
            <button
              type="button"
              data-demo-tab="settings"
              onClick={() => {
                setActiveTab('settings');
                setMobileInChat(false);
              }}
              title="Settings"
              aria-label="Settings"
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out active:scale-95',
                activeTab === 'settings'
                  ? 'bg-gradient-to-b from-[#7A2840] via-[#631D35] to-[#4D1526] text-white shadow-md shadow-wine/40 ring-1 ring-white/35 scale-[1.04]'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--row-hover)] hover:text-wine dark:hover:text-[#F3B3C2] hover:scale-105'
              )}
            >
              <Settings className="h-[19px] w-[19px] shrink-0 transition-transform duration-150 group-hover:scale-105" strokeWidth={activeTab === 'settings' ? 2.2 : 1.8} />
            </button>
          </nav>

          {/* Subtle horizontal divider above account utility section */}
          <div className="w-7 h-px bg-[var(--chat-divider,#EBE3E0)] dark:bg-white/10 my-1.5 shrink-0" role="separator" />
          <div className="flex flex-col items-center gap-1.5 w-full shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setMobileInChat(false);
              }}
              title="Demo Visitor Identity"
              aria-label="Demo Visitor Identity"
              className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden shadow-xs ring-1 ring-[var(--border)]">
                <NexusAvatar3D id="demo-visitor-me" name="You" size="xs" className="h-full w-full" />
              </div>
              <span
                aria-hidden="true"
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-[#1C1619] bg-emerald-600"
              />
            </button>

            {/* Theme Toggle in Navigation Dock */}
            <button
              type="button"
              onClick={() => updateAppearance({ theme: isDarkTheme ? 'light' : 'midnight-wine' })}
              title={isDarkTheme ? 'Switch to Porcelain theme' : 'Switch to Deep Wine theme'}
              aria-label={isDarkTheme ? 'Switch to Porcelain theme' : 'Switch to Deep Wine theme'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all duration-150 ease-out hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 dark:hover:text-[#F3B3C2] active:scale-90"
            >
              {isDarkTheme ? (
                <Sun className="h-3.5 w-3.5 text-[#F3B3C2]" strokeWidth={1.8} />
              ) : (
                <Moon className="h-3.5 w-3.5 text-wine" strokeWidth={1.8} />
              )}
            </button>

            <Link
              href="/login"
              title="Exit Demo to Login"
              aria-label="Exit Demo"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all duration-150 ease-out hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 dark:hover:text-[#F3B3C2] active:scale-90"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main Stage Content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* 1. MESSAGES TAB */}
        {activeTab === 'messages' && (
          <>
            {/* Contact List Sidebar */}
            <aside
              aria-label="Demo Contacts"
              className={cn(
                'w-full md:w-[320px] lg:w-[360px] xl:w-[380px] shrink-0 border-r border-stone/40 dark:border-white/10 nx-glass-column flex flex-col h-full min-h-0 overflow-hidden',
                mobileInChat ? 'hidden md:flex' : 'flex'
              )}
            >
              {/* Header */}
              <div className="p-4 border-b border-stone/40 dark:border-white/10 bg-white/60 dark:bg-[#140F13]/60 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h1 className="font-semibold text-lg tracking-tight text-charcoal dark:text-[#EDE8EC]">
                    Conversations
                  </h1>
                </div>

                {/* Search Input */}
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search demo contacts…"
                    className="w-full rounded-xl bg-[var(--field-bg,var(--surface))] dark:bg-[#1A1418] border border-[var(--border)] dark:border-white/10 py-2 pl-9 pr-3 text-[12.5px] text-charcoal dark:text-[#EDE8EC] placeholder:text-[var(--foreground-ghost)] dark:placeholder:text-white/40 shadow-2xs focus:border-wine/50 focus:ring-[1.5px] focus:ring-wine/15 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Nexus Moments (Demo Status Experience) */}
              <DemoStatusStrip
                profiles={DEMO_STATUS_PROFILES}
                viewedProfileIds={viewedStatusIds}
                onSelectProfile={handleSelectStatusProfile}
              />

              {/* Nexus Discovery Quick Entry Banner */}
              <div className="px-3 py-2 bg-gradient-to-r from-wine/10 via-[#8C475A]/10 to-transparent border-b border-stone-subtle dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('discovery');
                    setMobileInChat(false);
                  }}
                  className="w-full text-left flex items-center justify-between p-2 rounded-xl bg-white/90 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-stone/80 dark:border-white/10 shadow-2xs group transition-all active:scale-[0.98]"
                  title="Explore Nexus Discovery"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-wine text-white shadow-2xs shrink-0">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[12px] text-charcoal dark:text-[#EDE8EC]">Nexus Discovery</span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-full bg-wine/15 text-wine dark:text-[#F3B3C2] font-semibold">
                          Explore
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted truncate">Connected world of people &amp; stories</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-wine dark:text-[#F3B3C2] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>

              {/* List */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-2.5 py-2 space-y-1 pb-28 md:pb-2"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {filteredContacts.map((contact) => (
                  <DemoContactRow
                    key={contact.id}
                    contact={contact}
                    isSelected={contact.id === activeContact.id}
                    isTyping={Boolean(isTypingSimulated && contact.id === activeContact.id)}
                    onSelect={() => handleSelectContact(contact.id)}
                    onTogglePin={handleTogglePinContact}
                    onOpenContextMenu={(contactId, x, y) => setContextMenu({ contactId, x, y })}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </aside>

            {/* Conversation Active Stage */}
            <main
              aria-label="Demo Chat Thread"
              className={cn(
                'relative flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden bg-[var(--pane-chat-bg,var(--background))]',
                !mobileInChat ? 'hidden md:flex' : 'flex'
              )}
              style={demoChatThemeStyles as React.CSSProperties}
            >
              {/* Unified Conversation Header */}
              <header
                className="relative z-20 flex h-[76px] md:h-[68px] shrink-0 items-center justify-between border-b px-4 sm:px-6 select-none transition-colors backdrop-blur-2xl bg-white/75 dark:bg-[#181116]/80 border-black/[0.06] dark:border-white/[0.08] shadow-xs"
              >
                {/* Left Edge: Back Navigation Button (mobile only) */}
                <div className="flex md:hidden items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => setMobileInChat(false)}
                    aria-label="Back to contacts list"
                    className="flex md:hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground)] dark:text-[#e0dce3] transition-all duration-150 active:scale-95 shadow-xs"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
                  </button>
                </div>

                {/* Desktop Left / Identity: Horizontal Avatar + Name/Status */}
                <div className="hidden md:flex items-center gap-3 z-10 min-w-0">
                  <button
                    type="button"
                    onClick={handleToggleDemoInfo}
                    aria-label={`View ${activeContact.name}'s conversation info`}
                    className="group flex items-center gap-3 py-1 px-1.5 -ml-1.5 rounded-2xl transition-transform active:scale-[0.98] text-left"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        id={activeContact.id}
                        display_name={activeContact.name}
                        avatar_url={activeContact.avatarUrl}
                        size="sm"
                        className="!h-10 !w-10 rounded-full"
                      />
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--chat-header-bg)]',
                          activeContact.status === 'online'
                            ? 'bg-emerald-500'
                            : activeContact.status === 'away'
                            ? 'bg-amber-500'
                            : 'bg-stone-500'
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <h2 className="truncate text-[14px] sm:text-[15px] font-medium tracking-tight text-charcoal dark:text-[#EDE8EC] leading-tight">
                        {activeContact.name}
                      </h2>
                      <p className="mt-0.5 truncate text-[11.5px] font-normal text-[var(--foreground-muted)] dark:text-[#8e8a92] leading-tight">
                        {activeContact.id === 'contact-aasif' ? 'Active now' : (activeContact.subtitle || activeContact.statusText)}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Mobile Screen Center: Centered Circular DP, Name & Subtitle on exact central axis */}
                <div className="absolute inset-0 flex md:hidden items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    onClick={handleToggleDemoInfo}
                    aria-label={`View ${activeContact.name}'s conversation info`}
                    className="group flex flex-col items-center justify-center text-center pointer-events-auto py-1 px-3 rounded-2xl transition-transform active:scale-[0.98]"
                  >
                    {/* Centered Circular DP */}
                    <div className="relative mb-1">
                      <UserAvatar
                        id={activeContact.id}
                        display_name={activeContact.name}
                        avatar_url={activeContact.avatarUrl}
                        size="sm"
                        className="!h-9 !w-9 sm:!h-10 sm:!w-10 rounded-full"
                      />
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--chat-header-bg)]',
                          activeContact.status === 'online'
                            ? 'bg-emerald-500'
                            : activeContact.status === 'away'
                            ? 'bg-amber-500'
                            : 'bg-stone-500'
                        )}
                      />
                    </div>

                    {/* Centered Contact Name */}
                    <div className="flex items-center justify-center gap-1.5 max-w-[200px] sm:max-w-xs">
                      <h2 className="truncate text-[14px] sm:text-[15px] font-medium tracking-tight text-charcoal dark:text-[#EDE8EC] leading-tight">
                        {activeContact.name}
                      </h2>
                    </div>

                    {/* Centered Subtitle */}
                    <p className="mt-0.5 truncate text-[11px] sm:text-[11.5px] font-normal text-[var(--foreground-muted)] dark:text-[#8e8a92] leading-tight max-w-[190px] sm:max-w-xs">
                      {activeContact.id === 'contact-aasif' ? 'Active now' : (activeContact.subtitle || activeContact.statusText)}
                    </p>
                  </button>
                </div>

                {/* Right Edge: Call Controls (Voice & Video Call) & Info Toggle */}
                <div className="flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => setDemoCallType('voice')}
                    title={`Voice call ${activeContact.name}`}
                    aria-label={`Voice call ${activeContact.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:text-[#e0dce3] dark:hover:text-white transition-all duration-150 active:scale-95 shadow-xs"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoCallType('video')}
                    title={`Video call ${activeContact.name}`}
                    aria-label={`Video call ${activeContact.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:text-[#e0dce3] dark:hover:text-white transition-all duration-150 active:scale-95 shadow-xs"
                  >
                    <Video className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleDemoInfo}
                    title={`View ${activeContact.name}'s conversation info`}
                    aria-label={`View ${activeContact.name}'s conversation info`}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-150 active:scale-95 shadow-xs',
                      (demoInfoOpen || mobileDemoInfoOpen)
                        ? 'bg-wine/15 text-wine border-wine/30 dark:bg-wine/25 dark:text-[#F3B3C2]'
                        : 'bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:text-[#e0dce3] dark:hover:text-white'
                    )}
                  >
                    <Info className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </header>

              {/* Message List with Living Canvas */}
              <div
                key={activeContact.id}
                ref={demoScrollRef}
                onScroll={handleDemoScroll}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 sm:px-6 pt-6 pb-4 animate-fade-in nx-living-canvas [overflow-anchor:auto] flex flex-col scroll-pt-6"
                style={{ WebkitOverflowScrolling: 'touch', overflowAnchor: 'auto' }}
              >
                {activeContact.conversation.length === 0 ? (
                  activeContact.id === 'contact-aasif' ? (
                    /* Signature Welcome Moment for Aasif (Mutually exclusive empty state) */
                    <div className="my-auto w-full py-4 flex flex-col items-center justify-center animate-fade-in">
                      <div className="liquid-glass-card mx-auto max-w-md my-2 rounded-3xl p-6 shadow-xl text-center animate-fade-up">
                        <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center">
                          <UserAvatar
                            id="contact-aasif"
                            display_name="Mr Aasif"
                            avatar_url={activeContact.avatarUrl}
                            size="xl"
                            className="!h-16 !w-16 shadow-2xs"
                            showCreatorBadge
                          />
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white dark:border-[#20181D] bg-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 rounded-full bg-wine/10 dark:bg-wine/25 px-3 py-0.5 text-[11px] font-medium text-wine dark:text-[#E2A6B3] mb-1.5 border border-wine/20">
                          <Sparkles className="h-3 w-3 text-wine dark:text-[#E2A6B3]" />
                          <span>Welcome to Nexus.talks</span>
                        </div>

                        {/* Signature Nexus Constellation Motif */}
                        <div className="my-1.5 flex justify-center">
                          <NexusMark variant="constellation" size={15} className="opacity-75" />
                        </div>

                        <h3 className="text-xl font-semibold tracking-tight text-charcoal dark:text-foreground">
                          Aasif
                        </h3>

                        <p className="text-[12.5px] font-medium text-wine dark:text-[#E2A6B3] mt-0.5">
                          <a
                            href="https://www.instagram.com/the_aasif9/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline inline-flex items-center gap-1 font-mono"
                            title="Visit @the_aasif9 on Instagram"
                          >
                            @the_aasif9
                          </a>
                        </p>

                        <p className="mt-2.5 text-[13px] leading-relaxed text-muted dark:text-muted-foreground max-w-xs mx-auto">
                          Building things, exploring ideas, and making conversations feel more human.
                        </p>

                        {/* Living Profile Action for Aasif */}
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenLivingProfile('contact-aasif')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-wine/10 dark:bg-wine/25 hover:bg-wine/20 border border-wine/25 px-3.5 py-1.5 text-xs font-semibold text-wine dark:text-[#F3B3C2] transition-all hover:scale-105 active:scale-95"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" />
                            <span>Explore Aasif&apos;s Living Profile</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('discovery');
                              setMobileInChat(false);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-porcelain dark:bg-white/10 hover:bg-stone/30 border border-stone-subtle dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-charcoal dark:text-stone transition-all hover:scale-105 active:scale-95"
                          >
                            <Compass className="h-3.5 w-3.5 text-wine" />
                            <span>The Creator&apos;s Corner</span>
                          </button>
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-stone-subtle dark:border-[#33252E] flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
                          <span>Send a greeting below (e.g. &ldquo;hi&rdquo; or &ldquo;hello&rdquo;) to start chatting</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Generic Empty Conversation Card for other contacts */
                    <div className="my-auto w-full py-6 flex flex-col items-center justify-center animate-fade-in">
                      <EmptyConversation
                        title={`Chat with ${activeContact.name}`}
                        description="Send a message below to start chatting in isolated demo mode."
                        participantName={activeContact.name}
                        participantUsername={activeContact.handle}
                        showActions={false}
                      />
                    </div>
                  )
                ) : (
                  /* Active conversation history header */
                  <>
                    {activeContact.id !== 'contact-aasif' && (
                      <div className="mx-auto max-w-sm rounded-xl border border-stone-subtle dark:border-[#382833] bg-porcelain/60 dark:bg-[#231A20] p-3.5 text-center text-[12px] text-muted animate-fade-in flex flex-col items-center gap-2.5">
                        <p>
                          Connected to <span className="font-semibold text-charcoal dark:text-foreground">{activeContact.name}</span> in isolated demo mode.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenLivingProfile(activeContact.id)}
                            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-wine dark:text-[#F3B3C2] hover:underline"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>View Living Profile &rarr;</span>
                          </button>

                          {(() => {
                            const conns = getDiscoveryConnections(activeContact.id);
                            const groupConn = conns.find((c) => c.targetType === 'group');
                            const storyConn = conns.find((c) => c.targetType === 'story');

                            return (
                              <>
                                {storyConn && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStoriesFromProfile(storyConn.targetId)}
                                    className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-white/10 border border-stone-subtle dark:border-white/10 px-2 py-0.5 text-[10.5px] font-medium text-wine dark:text-[#F3B3C2] hover:bg-stone/20"
                                  >
                                    <span>Story: {storyConn.title}</span>
                                  </button>
                                )}
                                {groupConn && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('groups');
                                      handleSelectGroup(groupConn.targetId);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-white/10 border border-stone-subtle dark:border-white/10 px-2 py-0.5 text-[10.5px] font-medium text-charcoal dark:text-stone hover:bg-stone/20"
                                  >
                                    <Layers className="h-3 w-3 text-wine" />
                                    <span>{groupConn.title}</span>
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Quiet Subdued Day Separator */}
                    <div className="my-5 flex justify-center w-full select-none" role="separator" aria-label="Today">
                      <div className="flex items-center px-3 py-0.5 rounded-full text-[11px] font-medium tracking-wider uppercase bg-black/[0.04] dark:bg-white/5 text-[#6c6770] dark:text-white/40 select-none border border-black/[0.03] dark:border-white/[0.04]">
                        <span>Today</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Mobile dismiss backdrop when action toolbar is open */}
                {activeMobileActionMsgId && (
                  <div
                    className="fixed inset-0 z-40 bg-black/15 dark:bg-black/35 backdrop-blur-[2px] transition-opacity duration-150 nx-backdrop-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMobileActionMsgId(null);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveMobileActionMsgId(null);
                    }}
                    aria-hidden="true"
                  />
                )}

                {activeContact.conversation.map((msg, msgIdx, arr) => {
                  const prevMsg = arr[msgIdx - 1];
                  const nextMsg = arr[msgIdx + 1];
                  const joinsPrev = !!prevMsg && prevMsg.isOwn === msg.isOwn;
                  const joinsNext = !!nextMsg && nextMsg.isOwn === msg.isOwn;
                  const ownRadius = `18px ${joinsPrev ? '6px' : '18px'} ${joinsNext ? '6px' : '18px'} 18px`;
                  const otherRadius = `${joinsPrev ? '6px' : '18px'} 18px 18px ${joinsNext ? '6px' : '18px'}`;

                  return (
                  <div
                    key={msg.id}
                    id={`demo-msg-${msg.id}`}
                    tabIndex={0}
                    role="article"
                    aria-label={`Message from ${msg.isOwn ? 'you' : msg.senderName}: ${msg.content}`}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'c' || e.key === 'C') {
                        e.preventDefault();
                        handleCopyText(msg.content, msg.id);
                      } else if (e.key === 'r' || e.key === 'R') {
                        e.preventDefault();
                        setReplyingTo({
                          id: msg.id,
                          senderName: msg.senderName,
                          content: msg.content,
                        });
                        inputRef.current?.focus();
                      } else if ((e.key === 'e' || e.key === 'E') && msg.isOwn) {
                        e.preventDefault();
                        handleStartEdit({ id: msg.id, content: msg.content });
                      } else if ((e.key === 'Delete' || e.key === 'Backspace') && msg.isOwn) {
                        e.preventDefault();
                        setDeletingMsgId(msg.id);
                      } else if (e.key === 'Escape') {
                        setActiveMobileActionMsgId(null);
                      }
                    }}
                    onTouchStart={(e) => handleMessageTouchStart(msg.id, e)}
                    onTouchMove={handleMessageTouchMove}
                    onTouchEnd={handleMessageTouchEnd}
                    onTouchCancel={handleMessageTouchCancel}
                    onContextMenu={(e) => handleMessageContextMenu(msg.id, e)}
                    className={cn(
                      'group relative flex flex-col animate-message-enter transition-all duration-300 rounded-2xl p-1 -m-1 touch-pan-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine/50 dark:focus-visible:ring-[#F3B3C2]/50',
                      joinsPrev ? 'chat-msg-gap-join' : 'chat-msg-gap-new first:mt-0',
                      activeMobileActionMsgId === msg.id && 'z-50',
                      highlightedMsgId === msg.id && 'ring-2 ring-wine ring-offset-2 ring-offset-porcelain dark:ring-offset-[#1A1317] bg-wine/10 dark:bg-wine/20 scale-[1.01]',
                      msg.isOwn ? 'items-end' : 'items-start'
                    )}
                  >
                    {/* Desktop Hover Toolbar (Hidden on mobile) */}
                    <div
                      className={cn(
                        'hidden md:flex items-center gap-0.5 rounded-full liquid-glass-popover px-1.5 py-0.5 transition-all duration-150 ease-spring absolute top-0 -translate-y-1/2 z-20',
                        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 scale-95',
                        msg.isOwn ? 'right-2' : 'left-2'
                      )}
                    >
                      {CURATED_REACTIONS.map((emoji) => {
                        const isSelected = (msg.reactions || []).some((r) => r.emoji === emoji && r.hasReacted);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full hover:bg-stone/50 dark:hover:bg-[#382832] hover:scale-115 active:scale-90 transition-transform text-[12px]',
                              isSelected && 'bg-wine/15 dark:bg-wine/30 ring-1 ring-wine/40'
                            )}
                            title={`React with ${emoji}`}
                            aria-label={`React with ${emoji}`}
                          >
                            <span>{emoji}</span>
                          </button>
                        );
                      })}
                      <div className="mx-0.5 h-3.5 w-[1px] bg-stone/70 dark:bg-[#3B2C34]" />
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo({
                            id: msg.id,
                            senderName: msg.senderName,
                            content: msg.content,
                          });
                          inputRef.current?.focus();
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832] active:scale-90 transition-all"
                        title="Reply"
                        aria-label="Reply to message"
                      >
                        <Reply className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.content, msg.id)}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full active:scale-90 transition-all',
                          copiedMsgId === msg.id
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                            : 'text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832]'
                        )}
                        title={copiedMsgId === msg.id ? 'Copied!' : 'Copy text'}
                        aria-label={copiedMsgId === msg.id ? 'Copied to clipboard' : 'Copy message text'}
                      >
                        {copiedMsgId === msg.id ? <Check className="h-3 w-3 stroke-[2.5]" /> : <Copy className="h-3 w-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDemoEchoModalTarget({
                            id: msg.id,
                            content: msg.content,
                            senderName: msg.senderName,
                          });
                        }}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full active:scale-90 transition-all',
                          demoEchoes.some((de) => de.messageId === msg.id)
                            ? 'text-wine dark:text-[#F3B3C2] bg-wine/10 dark:bg-wine/30'
                            : 'text-muted hover:text-wine dark:hover:text-[#F3B3C2] hover:bg-stone/50 dark:hover:bg-[#382832]'
                        )}
                        title={demoEchoes.some((de) => de.messageId === msg.id) ? 'Saved in Demo Echoes' : 'Save to Demo Echoes'}
                        aria-label="Save to Demo Echoes"
                      >
                        <Bookmark className={cn('h-3 w-3', demoEchoes.some((de) => de.messageId === msg.id) && 'fill-current')} />
                      </button>

                      {msg.isOwn && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit({ id: msg.id, content: msg.content })}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-charcoal dark:hover:text-stone hover:bg-stone/50 dark:hover:bg-[#382832] active:scale-90 transition-all"
                            title="Edit message"
                            aria-label="Edit message"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingMsgId(msg.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-90 transition-all"
                            title="Delete message"
                            aria-label="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Mobile Contextual Popover Actions (440ms Long-Press / Context Menu) */}
                    {activeMobileActionMsgId === msg.id && (
                      <div
                        data-mobile-popover="true"
                        className={cn(
                          'absolute z-50 flex flex-col gap-1.5 nx-popover-enter',
                          'max-w-[calc(100vw-32px)] select-none',
                          msg.isOwn ? 'right-0 items-end' : 'left-0 items-start',
                          mobileActionPlaceBelow ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 1. Curated Reaction Emojis Bar */}
                        <div className="flex items-center gap-1 rounded-full px-2 py-1.5 shadow-xl border border-[var(--border)] bg-[var(--surface)]/98 backdrop-blur-md">
                          {CURATED_REACTIONS.map((emoji) => {
                            const isSelected = (msg.reactions || []).some((r) => r.emoji === emoji && r.hasReacted);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  handleToggleReaction(msg.id, emoji);
                                  setActiveMobileActionMsgId(null);
                                }}
                                className={cn(
                                  'flex h-9 w-9 items-center justify-center rounded-full text-base hover:scale-120 active:scale-90 transition-transform duration-120',
                                  isSelected && 'bg-wine/15 dark:bg-wine/30 ring-1.5 ring-wine dark:ring-[#F3B3C2]'
                                )}
                                title={`React with ${emoji}`}
                                aria-label={`React with ${emoji}`}
                              >
                                <span>{emoji}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* 2. Action Buttons Pill */}
                        <div className="flex items-center gap-1 rounded-2xl p-1 shadow-xl border border-[var(--border)] bg-[var(--surface)]/98 backdrop-blur-md">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo({
                                id: msg.id,
                                senderName: msg.senderName,
                                content: msg.content,
                              });
                              setActiveMobileActionMsgId(null);
                              inputRef.current?.focus();
                            }}
                            className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-[var(--row-hover)] active:scale-95 transition-all"
                            title="Reply to message"
                            aria-label="Reply to message"
                          >
                            <Reply className="h-3.5 w-3.5 text-wine dark:text-[#F3B3C2]" />
                            <span>Reply</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleCopyText(msg.content, msg.id);
                              setActiveMobileActionMsgId(null);
                            }}
                            className={cn(
                              'flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold active:scale-95 transition-all',
                              copiedMsgId === msg.id
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 font-bold'
                                : 'text-charcoal dark:text-foreground hover:bg-[var(--row-hover)]'
                            )}
                            title={copiedMsgId === msg.id ? 'Copied!' : 'Copy text'}
                            aria-label="Copy message text"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="h-3.5 w-3.5 stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-wine dark:text-[#F3B3C2]" />
                            )}
                            <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDemoEchoModalTarget({
                                id: msg.id,
                                content: msg.content,
                                senderName: msg.senderName,
                              });
                              setActiveMobileActionMsgId(null);
                            }}
                            className={cn(
                              'flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95',
                              demoEchoes.some((de) => de.messageId === msg.id)
                                ? 'text-wine dark:text-[#F3B3C2] bg-wine/10 dark:bg-wine/25 font-bold'
                                : 'text-charcoal dark:text-foreground hover:bg-[var(--row-hover)]'
                            )}
                            title={demoEchoes.some((de) => de.messageId === msg.id) ? 'Saved in Demo Echoes' : 'Save to Demo Echoes'}
                            aria-label="Save to Demo Echoes"
                          >
                            <Bookmark className={cn('h-3.5 w-3.5', demoEchoes.some((de) => de.messageId === msg.id) ? 'fill-current text-wine dark:text-[#F3B3C2]' : 'text-wine dark:text-[#F3B3C2]')} />
                            <span>{demoEchoes.some((de) => de.messageId === msg.id) ? 'Saved' : 'Save'}</span>
                          </button>

                          {msg.isOwn && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleStartEdit({ id: msg.id, content: msg.content });
                                  setActiveMobileActionMsgId(null);
                                }}
                                className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-[var(--row-hover)] active:scale-95 transition-all"
                                title="Edit message"
                                aria-label="Edit message"
                              >
                                <Pencil className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingMsgId(msg.id);
                                  setActiveMobileActionMsgId(null);
                                }}
                                className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all"
                                title="Delete message"
                                aria-label="Delete message"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sender Name Label above incoming message (group chats only) */}
                    {Boolean(activeContact.isGroup) && !msg.isOwn && !joinsPrev && (
                      <span className="text-[11.5px] font-medium text-[#a5a1a8] mb-1 ml-1 select-none leading-none">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      className={cn(
                        'relative w-fit max-w-[85%] sm:max-w-[78%] px-4 py-2.5 text-[13.5px] leading-relaxed transition-all border',
                        msg.isOwn
                          ? 'text-[var(--message-outgoing-text)]'
                          : 'text-[var(--message-incoming-text)]'
                      )}
                      style={
                        msg.isOwn
                          ? {
                              borderRadius: ownRadius,
                              background: 'var(--chat-outgoing-bg, linear-gradient(135deg, #78263F 0%, #631D35 55%, #4C1425 100%))',
                              borderColor: 'var(--chat-outgoing-border, rgba(255, 255, 255, 0.22))',
                              color: 'var(--chat-outgoing-text, #FFFFFF)',
                              boxShadow: 'var(--chat-outgoing-shadow, 0 4px 18px -2px rgba(99, 29, 53, 0.32), inset 0 1px 0.5px rgba(255, 255, 255, 0.35))',
                            }
                          : {
                              backgroundColor: 'var(--chat-incoming-bg, var(--message-incoming-bg))',
                              borderColor: 'var(--chat-incoming-border, var(--message-incoming-border))',
                              boxShadow: 'var(--chat-incoming-shadow, var(--message-bubble-shadow))',
                              color: 'var(--chat-incoming-text, var(--message-incoming-text))',
                              borderRadius: otherRadius,
                            }
                      }
                    >
                      {/* Quoted Reply Preview */}
                      {msg.replyTo && (
                        <button
                          type="button"
                          disabled={msg.replyTo.isDeleted}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!msg.replyTo?.isDeleted) {
                              handleJumpToMessage(msg.replyTo!.id);
                            }
                          }}
                          className={cn(
                            'mb-2 flex w-full items-start gap-2 rounded-lg border-l-2 p-2 text-left text-xs transition-opacity',
                            msg.replyTo.isDeleted
                              ? 'cursor-default opacity-60'
                              : 'cursor-pointer hover:opacity-90',
                            msg.isOwn
                              ? 'border-white/70 bg-white/10 text-white/90'
                              : 'border-white/40 bg-white/5 text-white/80'
                          )}
                          title={msg.replyTo.isDeleted ? 'Original message was deleted' : 'Jump to original message'}
                        >
                          <div className="min-w-0 flex-1">
                            <div className={cn('font-semibold text-[11px]', msg.isOwn ? 'text-white' : 'text-white/90')}>
                              {msg.replyTo.senderName}
                            </div>
                            <p className={cn('truncate text-[11px]', msg.replyTo.isDeleted ? 'italic' : 'opacity-80')}>
                              {msg.replyTo.content}
                            </p>
                          </div>
                        </button>
                      )}

                      {/* Audio Message or Regular Text */}
                      {msg.isAudio || msg.content.startsWith('[audio') ? (
                        <div className="flex flex-col gap-1 w-full min-w-[210px] sm:min-w-[230px]">
                          <div className="flex items-center gap-2.5 py-0.5">
                            <button
                              type="button"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#19171b] shadow-sm hover:scale-105 active:scale-95 transition-transform"
                              aria-label="Play audio"
                            >
                              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                            </button>
                            <div className="flex flex-1 items-center gap-[3px] h-6 px-1">
                              {[0.35, 0.6, 0.9, 1.0, 0.7, 0.85, 0.45, 0.8, 0.65, 0.35, 0.9, 0.55, 0.75, 1.0, 0.8, 0.45, 0.65, 0.35, 0.5, 0.25].map((h, i) => (
                                <span
                                  key={i}
                                  className="w-[2.5px] rounded-full bg-white/70"
                                  style={{ height: `${Math.max(4, h * 20)}px` }}
                                />
                              ))}
                            </div>
                            <span className="text-[11.5px] font-medium text-[#b0acb3] tabular-nums shrink-0">
                              {msg.audioDuration || '0:05'}
                            </span>
                          </div>
                          <div className="flex justify-end items-center gap-1 text-[10px] text-[#8e8a92] pt-0.5 select-none">
                            <span>{msg.timestamp}</span>
                            {msg.isOwn && <Check className="h-2.5 w-2.5 stroke-[2.2] opacity-80" />}
                          </div>
                        </div>
                      ) : msg.isImage || msg.imageUrl ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="rounded-xl overflow-hidden max-w-[280px] sm:max-w-[320px] shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.imageUrl || msg.content}
                              alt="Shared media"
                              className="w-full h-auto object-cover rounded-xl hover:opacity-95 transition-opacity"
                            />
                          </div>
                          <div
                            className={cn(
                              'ml-auto flex items-center gap-1 shrink-0 text-[10px] tabular-nums select-none leading-none mb-0.5',
                              msg.isOwn ? 'text-white/70' : 'text-[#8e8a92]'
                            )}
                          >
                            {msg.timestamp && <span>{msg.timestamp}</span>}
                            {msg.isOwn && <Check className="h-2.5 w-2.5 stroke-[2.2] opacity-80" aria-label="Sent" />}
                          </div>
                        </div>
                      ) : msg.content.endsWith('.pdf') ? (
                        <div className="flex flex-col gap-1 w-full min-w-[190px]">
                          <div className="flex items-center gap-2.5 p-1 rounded-lg">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wine/10 dark:bg-wine/20 text-wine dark:text-[#F3B3C2]">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate text-inherit">
                                {msg.content.split('/').pop()}
                              </p>
                              <span className="text-[10px] opacity-70">PDF Document</span>
                            </div>
                          </div>
                          <div
                            className={cn(
                              'ml-auto flex items-center gap-1 shrink-0 text-[10px] tabular-nums select-none leading-none mb-0.5',
                              msg.isOwn ? 'text-white/70' : 'text-[#8e8a92]'
                            )}
                          >
                            {msg.timestamp && <span>{msg.timestamp}</span>}
                            {msg.isOwn && <Check className="h-2.5 w-2.5 stroke-[2.2] opacity-80" aria-label="Sent" />}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                          <div className="flex-1 min-w-0">
                            {msg.content.includes('@the_aasif9') ? (
                              <div className="whitespace-pre-line leading-relaxed">
                                {msg.content.split('@the_aasif9').map((part, i, arrPart) => (
                                  <span key={i}>
                                    {part}
                                    {i < arrPart.length - 1 && (
                                      <a
                                        href="https://www.instagram.com/the_aasif9/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          'font-bold underline underline-offset-2 hover:opacity-80 transition-opacity inline-flex items-center gap-0.5',
                                          msg.isOwn ? 'text-white' : 'text-wine dark:text-[#F3B3C2]'
                                        )}
                                      >
                                        @the_aasif9
                                      </a>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="whitespace-pre-line leading-relaxed break-words">{msg.content}</p>
                            )}
                          </div>
                          <div
                            className={cn(
                              'ml-auto flex items-center gap-1 shrink-0 text-[10px] tabular-nums select-none leading-none mb-0.5',
                              msg.isOwn ? 'text-white/70' : 'text-[#8e8a92]'
                            )}
                          >
                            {msg.editedAt && (
                              <span
                                className="italic mr-0.5 text-[9.5px] opacity-80"
                                title="Edited"
                              >
                                (edited)
                              </span>
                            )}
                            {msg.timestamp && <span>{msg.timestamp}</span>}
                            {msg.isOwn && <Check className="h-2.5 w-2.5 stroke-[2.2] opacity-80" aria-label="Sent" />}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reaction Chips */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div
                        className={cn(
                          'mt-1 flex flex-wrap gap-1 px-1',
                          msg.isOwn ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg.id, r.emoji);
                            }}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-transform duration-120 ease-spring hover:scale-105 active:scale-90',
                              r.hasReacted
                                ? 'border-wine/40 bg-wine/10 text-wine dark:border-wine/50 dark:bg-wine/25 dark:text-[#F3B3C2]'
                                : 'border-stone-subtle bg-white/80 text-muted hover:border-wine/30 dark:border-white/10 dark:bg-[#1F171C] dark:text-stone'
                            )}
                            title={`${r.count} reaction${r.count > 1 ? 's' : ''}`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[11px] font-semibold">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

                {isTypingSimulated && (
                  <div className="flex items-center gap-2 py-2 px-3.5 rounded-2xl bg-porcelain dark:bg-[#251D22] border border-stone/80 dark:border-[#3B2C34] w-fit shadow-xs animate-fade-up">
                    <span className="text-[11.5px] font-medium text-muted">
                      {activeContact.name} is typing
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot" style={{ animationDelay: '180ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-wine dark:bg-[#E2A6B3] animate-typing-dot" style={{ animationDelay: '360ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Floating New Messages Affordance */}
              {hasDemoNewMessagesBelow && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 nx-banner-enter">
                  <button
                    type="button"
                    onClick={() => {
                      const el = demoScrollRef.current;
                      if (el) {
                        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                        setHasDemoNewMessagesBelow(false);
                        isDemoAtBottomRef.current = true;
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-wine text-white shadow-lg text-[12px] font-semibold hover:bg-wine-hover active:scale-95 transition-all shadow-wine/25"
                    aria-label="Scroll to new messages"
                  >
                    <span>New messages</span>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Composer */}
              <div
                className="relative z-10 shrink-0 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t backdrop-blur-2xl bg-white/80 dark:bg-[#181116]/85 border-black/[0.06] dark:border-white/[0.08] transition-colors"
              >
                <div className="mx-auto w-full max-w-3xl">
                  {/* Editing Banner */}
                  {editingMsg && (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-wine/25 bg-wine/10 px-3 py-1.5 dark:border-wine/30 dark:bg-wine/20 animate-fade-in">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-4 w-1 rounded-full bg-wine shrink-0" />
                        <Pencil className="h-3.5 w-3.5 text-wine shrink-0" />
                        <div className="min-w-0 text-xs">
                          <span className="font-semibold text-wine dark:text-[#F3B3C2]">
                            Editing message
                          </span>
                          <p className="truncate text-muted text-[11px]">{editingMsg.content}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-md p-1 text-muted hover:text-charcoal dark:hover:text-white transition-colors"
                        title="Cancel edit (Esc)"
                        aria-label="Cancel edit"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Replying Banner */}
                  {!editingMsg && replyingTo && (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-wine/25 bg-wine/10 px-3 py-1.5 dark:border-wine/30 dark:bg-wine/20 animate-fade-in">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-4 w-1 rounded-full bg-wine shrink-0" />
                        <div className="min-w-0 text-xs">
                          <span className="font-semibold text-wine dark:text-[#F3B3C2]">
                            Replying to {replyingTo.senderName}
                          </span>
                          <p className="truncate text-muted text-[11px]">{replyingTo.content}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="rounded-md p-1 text-muted hover:text-charcoal dark:hover:text-white transition-colors"
                        title="Cancel reply (Esc)"
                        aria-label="Cancel reply"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {simulatedFeedback && (
                    <div className="mb-2 text-center text-[11px] font-medium text-wine dark:text-[#F3B3C2] animate-fade-in">
                      {simulatedFeedback}
                    </div>
                  )}

                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2"
                  >
                    {/* Main Input Pill */}
                    <div className="flex flex-1 min-w-0 items-center gap-2.5 rounded-[22px] px-3.5 py-2 bg-white/90 dark:bg-[#20181e]/90 border border-black/[0.08] dark:border-white/[0.12] shadow-xs focus-within:border-wine/40 dark:focus-within:border-[#F3B3C2]/40 focus-within:ring-2 focus-within:ring-wine/10 transition-all">
                      <button
                        type="button"
                        aria-label="Add attachment"
                        title="Add attachment (Coming in next release)"
                        onClick={() => {
                          setSimulatedFeedback('File attachments scheduled for next release');
                          setTimeout(() => setSimulatedFeedback(null), 2500);
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--foreground-muted)] dark:text-[#8e8a91] hover:text-[var(--foreground)] dark:hover:text-white transition-colors"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            if (editingMsg) {
                              handleCancelEdit();
                            } else if (replyingTo) {
                              setReplyingTo(null);
                            }
                          }
                        }}
                        placeholder={
                          editingMsg
                            ? 'Edit message…'
                            : replyingTo
                            ? `Replying to ${replyingTo.senderName}…`
                            : 'Send a message...'
                        }
                        className="flex-1 min-w-0 bg-transparent text-[14px] text-[var(--foreground)] dark:text-[#EDE8EC] placeholder:text-[var(--foreground-ghost)] dark:placeholder:text-[#7d7981] outline-none"
                      />
                    </div>

                    {/* Calendar Button */}
                    <button
                      type="button"
                      aria-label="Calendar"
                      title="Calendar scheduling (Coming in next release)"
                      onClick={() => {
                        setSimulatedFeedback('Calendar scheduling scheduled for next release');
                        setTimeout(() => setSimulatedFeedback(null), 2500);
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/80 dark:bg-white/[0.06] hover:bg-wine/10 hover:text-wine dark:hover:bg-wine/25 hover:border-wine/30 border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground-muted)] dark:text-[#8e8a91] hover:text-[var(--foreground)] dark:hover:text-white transition-all active:scale-95 shadow-xs"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>

                    {/* Microphone / Send Button */}
                    <button
                      type="submit"
                      onMouseDown={(e) => {
                        // Prevent blur to keep virtual keyboard open
                        e.preventDefault();
                      }}
                      onPointerDown={(e) => {
                        // Prevent touch pointer focus loss on mobile
                        e.preventDefault();
                      }}
                      disabled={editingMsg ? inputMessage.trim() === editingMsg.content : false}
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-90 shadow-sm',
                        inputMessage.trim() && (!editingMsg || inputMessage.trim() !== editingMsg.content)
                          ? 'bg-gradient-to-tr from-[#631D35] to-[#7E2843] text-white shadow-md shadow-wine/30 hover:brightness-110 active:scale-95 scale-100'
                          : 'bg-white/80 dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-[#343138] border border-black/[0.07] dark:border-white/[0.08] text-[var(--foreground-muted)] dark:text-[#8e8a91] hover:text-[var(--foreground)] dark:hover:text-white'
                      )}
                      title={editingMsg ? 'Save changes' : inputMessage.trim() ? 'Send message' : 'Voice message'}
                      aria-label={editingMsg ? 'Save changes' : inputMessage.trim() ? 'Send message' : 'Voice message'}
                    >
                      {editingMsg ? (
                        <Check className="h-4 w-4 stroke-[2.4]" />
                      ) : inputMessage.trim() ? (
                        <ArrowUp className="h-4 w-4 stroke-[2.4]" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                </div>
                <p className="mt-1.5 text-center text-[10.5px] text-[#7d7981] truncate">
                  Interactive local demo. No packets or messages leave your browser.
                </p>
              </div>

              {/* Demo Delete Confirmation Dialog */}
              {deletingMsgId && (
                <div
                  role="dialog"
                  aria-modal="true"
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs nx-backdrop-in"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setDeletingMsgId(null);
                  }}
                >
                  <div className="liquid-glass-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl nx-dialog-enter">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                        <Trash2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-charcoal dark:text-foreground">
                          Delete message?
                        </h2>
                        <p className="mt-1 text-xs text-muted dark:text-muted-foreground leading-relaxed">
                          This will remove this message locally. Quoted replies will show that the original message was deleted.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDeletingMsgId(null)}
                        className="rounded-xl border border-stone dark:border-[#3B2C34] bg-transparent px-4 py-2 text-xs font-semibold text-charcoal dark:text-stone hover:bg-stone/30 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(deletingMsgId)}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
                      >
                        Delete message
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* ── Right Details Panel: Desktop docked (xl+ / ≥1280px) ───── */}
            {demoInfoOpen && (
              <div className="hidden xl:flex shrink-0 h-full min-h-0 overflow-hidden">
                <ConversationInfoCenter
                  isOpen={true}
                  onClose={handleToggleDemoInfo}
                  displayName={activeContact.name}
                  username={activeContact.handle}
                  avatarUrl={activeContact.avatarUrl || null}
                  status={activeContact.status}
                  bio={activeContact.bio}
                  lastSeenAt={activeContact.lastSeen || (activeContact.status === 'online' ? 'Active now' : null)}
                  userId={activeContact.id}
                  conversationId={activeContact.id}
                  conversationType="direct"
                  isMuted={isDemoContactMuted}
                  onToggleMute={handleToggleDemoMute}
                  onOpenProfile={() => handleOpenLivingProfile(activeContact.id)}
                  messages={adaptedDemoMessages}
                  themePreference={demoThemePref}
                  onApplyTheme={handleApplyDemoTheme}
                  onResetTheme={handleResetDemoTheme}
                  onJumpToMessage={handleJumpToMessage}
                  variant="panel"
                />
              </div>
            )}

            {/* ── Mobile/Tablet Slide-Over Sheet (< 1280px) ─────────────────────────── */}
            {mobileDemoInfoOpen && (
              <div className="xl:hidden">
                <ConversationInfoCenter
                  isOpen={true}
                  onClose={() => setMobileDemoInfoOpen(false)}
                  displayName={activeContact.name}
                  username={activeContact.handle}
                  avatarUrl={activeContact.avatarUrl || null}
                  status={activeContact.status}
                  bio={activeContact.bio}
                  lastSeenAt={activeContact.lastSeen || (activeContact.status === 'online' ? 'Active now' : null)}
                  userId={activeContact.id}
                  conversationId={activeContact.id}
                  conversationType="direct"
                  isMuted={isDemoContactMuted}
                  onToggleMute={handleToggleDemoMute}
                  onOpenProfile={() => handleOpenLivingProfile(activeContact.id)}
                  messages={adaptedDemoMessages}
                  themePreference={demoThemePref}
                  onApplyTheme={handleApplyDemoTheme}
                  onResetTheme={handleResetDemoTheme}
                  onJumpToMessage={handleJumpToMessage}
                  variant="sheet"
                />
              </div>
            )}
          </>
        )}

        {/* PULSE TAB (Demo Mode: Isolated In-Memory) */}
        {activeTab === 'pulse' && (
          <main className="flex-1 overflow-y-auto bg-[var(--background)] p-5 sm:p-8 pb-28 md:pb-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone/80 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-wine/10 text-wine">
                      <Activity className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                      Nexus Pulse
                    </h1>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    In-memory demo overview of active personas, unread states, and recent activity.
                  </p>
                </div>
                <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                  POWERED BY AASIF · ISOLATED DEMO
                </span>
              </div>

              {/* Real in-memory metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="liquid-glass-card rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-muted">Unread Messages</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-wine">
                      {contacts.filter((c) => c.unreadCount > 0).length}
                    </span>
                    <span className="text-xs text-muted">demo contacts</span>
                  </div>
                </div>
                <div className="liquid-glass-card rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-muted">Active Contacts</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                      {contacts.length}
                    </span>
                    <span className="text-xs text-muted">connected</span>
                  </div>
                </div>
                <div className="liquid-glass-card rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-muted">Saved Moments</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                      {demoEchoes.length}
                    </span>
                    <span className="text-xs text-muted">in echoes</span>
                  </div>
                </div>
              </div>

              {/* Active Contacts Grid */}
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                  Recent Persona Activity
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-stone/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#1A1418] p-4 shadow-xs hover:border-wine/40 dark:hover:border-wine/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          id={contact.id}
                          display_name={contact.name}
                          avatar_url={contact.avatarUrl}
                          size="md"
                          className="shrink-0"
                          isPinned={contact.isPinned}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-charcoal dark:text-[#EDE8EC] truncate">
                              {contact.name}
                            </span>
                            {contact.unreadCount > 0 && (
                              <span className="h-2 w-2 rounded-full bg-wine shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted dark:text-[#9A9498] truncate mt-0.5">
                            {contact.lastMessageSnippet || 'No messages yet'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('messages');
                          handleSelectContact(contact.id);
                        }}
                        className="flex items-center gap-1 rounded-xl bg-wine/10 text-wine hover:bg-wine hover:text-white px-3 py-1.5 text-xs font-semibold transition-all shrink-0"
                      >
                        Chat <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ECHOES TAB (Demo Mode: Isolated In-Memory) */}
        {activeTab === 'echoes' && (
          <main className="flex-1 overflow-y-auto bg-[var(--background)] p-5 sm:p-8 pb-28 md:pb-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone/80 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-wine/10 text-wine">
                      <Bookmark className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                      Nexus Echoes
                    </h1>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Your bookmarked demo moments and private personal notes. 100% in-memory.
                  </p>
                </div>
                <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                  POWERED BY AASIF · ISOLATED DEMO
                </span>
              </div>

              {demoEchoes.length === 0 ? (
                <div className="rounded-2xl border border-stone/80 dark:border-white/10 bg-white dark:bg-[#1A1418] p-8 text-center">
                  <Bookmark className="h-8 w-8 mx-auto text-muted mb-2" />
                  <p className="text-sm font-semibold text-charcoal dark:text-[#EDE8EC]">No echoes saved in demo yet</p>
                  <p className="text-xs text-muted mt-1">
                    Hover over any message in Messages tab and click the bookmark icon to save moments!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {demoEchoes.map((echo) => (
                    <article
                      key={echo.id}
                      className="flex flex-col justify-between rounded-2xl border border-stone/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#1A1418] p-5 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              id={echo.contactId || echo.contactName}
                              display_name={echo.contactName}
                              avatar_url={getDeterministicDemoAvatar(echo.contactId || echo.contactName)}
                              size="xs"
                              className="shrink-0"
                            />
                            <div>
                              <span className="text-xs font-medium text-charcoal dark:text-[#EDE8EC] block">
                                {echo.contactName}
                              </span>
                              <span className="text-[10px] text-muted block">
                                {echo.timestamp}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted bg-stone-subtle px-2 py-0.5 rounded-full font-medium">
                            Saved
                          </span>
                        </div>

                        <div className="rounded-xl border border-stone-subtle dark:border-white/10 bg-porcelain/60 dark:bg-white/[0.04] p-3 text-xs leading-relaxed italic text-charcoal dark:text-[#DDD7DC]">
                          &ldquo;{echo.content}&rdquo;
                        </div>

                        {echo.note ? (
                          <div className="mt-3 rounded-xl border border-wine/20 bg-wine/5 dark:bg-wine/10 p-3">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-wine dark:text-[#E2A6B3] mb-1">
                              <Lock className="h-3 w-3" />
                              Private Note
                            </div>
                            <p className="text-xs text-charcoal dark:text-[#DDD7DC]">{echo.note}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-subtle dark:border-white/10 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setDemoEchoes((prev) => prev.filter((e) => e.id !== echo.id));
                            setSimulatedFeedback('Unsaved from Demo Echoes');
                            setTimeout(() => setSimulatedFeedback(null), 3000);
                          }}
                          className="text-[11px] font-medium text-muted hover:text-red-600 transition-colors"
                        >
                          Unsave
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('messages');
                            handleSelectContact(echo.contactId);
                            setTimeout(() => {
                              handleJumpToMessage(echo.messageId);
                            }, 150);
                          }}
                          className="flex items-center gap-1 rounded-xl bg-wine/10 text-wine hover:bg-wine hover:text-white px-3 py-1.5 text-xs font-semibold transition-all"
                        >
                          View in Chat <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </main>
        )}

        {/* 0. DISCOVERY TAB (Phase 10: Nexus Discovery) */}
        {activeTab === 'discovery' && (
          <DemoDiscoveryView
            onOpenLivingProfile={handleOpenLivingProfile}
            onOpenStories={handleOpenStoriesFromProfile}
            onSelectContact={(contactId) => {
              setActiveTab('messages');
              handleSelectContact(contactId);
            }}
            onSelectGroup={(groupId) => {
              setActiveTab('groups');
              handleSelectGroup(groupId);
            }}
            onReturnToMessages={() => {
              setActiveTab('messages');
              setMobileInChat(false);
            }}
            explorerProgress={explorerProgress}
            onUpdateProgress={setExplorerProgress}
          />
        )}

        {/* 2. COMMUNITIES TAB */}
        {activeTab === 'communities' && (
          <main className="flex-1 overflow-y-auto p-5 sm:p-8 pb-28 md:pb-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-stone dark:border-white/10 bg-white dark:bg-[#1A1418] px-3 py-0.5 text-xs text-muted mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-wine" />
                  <span>Curated Public Salons</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                  Sample Communities
                </h1>
                <p className="text-sm text-muted mt-1">
                  Nexus.talks communities are quiet discussion environments focused on shared craft, reading, and inquiry.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {DEMO_COMMUNITIES.map((comm) => (
                  <div
                    key={comm.id}
                    className="liquid-glass-card rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-sm shadow-xs"
                          style={{ backgroundColor: comm.accentColor }}
                        >
                          {comm.badge}
                        </span>
                        <span className="text-[11px] font-semibold text-muted dark:text-[#9A9498] rounded-full bg-porcelain dark:bg-white/[0.06] px-2.5 py-0.5">
                          {comm.category}
                        </span>
                      </div>

                      <h2 className="mt-3.5 text-base font-semibold text-charcoal dark:text-[#EDE8EC]">
                        {comm.name}
                      </h2>
                      <p className="mt-1 text-[12.5px] text-muted leading-relaxed">
                        {comm.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {comm.topics.map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-stone-subtle dark:bg-[#2A2027] px-2 py-0.5 text-[10.5px] text-charcoal/80 dark:text-stone/80"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-stone-subtle flex items-center justify-between text-xs">
                      <span className="text-muted flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {comm.memberCount.toLocaleString()} members
                      </span>
                      <span className="text-emerald-700 font-medium">
                        {comm.onlineCount} online
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {/* 3. GROUPS TAB */}
        {activeTab === 'groups' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Groups Sidebar */}
            <aside
              aria-label="Sample Groups"
              className={cn(
                'w-full md:w-[320px] shrink-0 border-r border-stone/40 dark:border-white/10 nx-glass-column flex flex-col',
                mobileInGroup ? 'hidden md:flex' : 'flex'
              )}
            >
              <div className="p-4 border-b border-stone/80 dark:border-white/10 bg-white/70 dark:bg-[#1A1418]/90">
                <h1 className="text-xl font-semibold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                  Collaborative Groups
                </h1>
                <p className="text-xs text-muted mt-0.5">3 active project circles</p>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-stone-subtle dark:divide-white/5 pb-28 md:pb-0">
                {groups.map((group) => {
                  const isSelected = group.id === activeGroup.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleSelectGroup(group.id)}
                      className={cn(
                        'w-full text-left p-3.5 flex items-start gap-3 transition-colors',
                        isSelected
                          ? 'bg-wine/5 dark:bg-wine/15 border-l-4 border-l-wine dark:border-l-[#D48B9B]'
                          : 'hover:bg-stone/30 dark:hover:bg-white/5 active:bg-stone/50 dark:active:bg-white/10'
                      )}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: group.accentColor }}
                      >
                        {group.monogram}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-medium text-[13.5px] text-charcoal dark:text-[#EDE8EC] truncate">
                          {group.name}
                        </h2>
                        <p className="text-[11.5px] text-muted truncate mt-0.5">
                          {group.topic}
                        </p>
                        <span className="text-[10.5px] text-muted/70 mt-1 inline-block">
                          {group.memberCount} members · {group.onlineCount} online
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Group Chat Thread */}
            <main
              aria-label="Sample Group Thread"
              className={cn(
                'flex-1 min-h-0 h-full flex flex-col overflow-hidden bg-white dark:bg-[#1A1317]',
                !mobileInGroup ? 'hidden md:flex' : 'flex'
              )}
            >
              <header className="p-3.5 border-b border-stone/80 dark:border-white/10 bg-porcelain/60 dark:bg-[#1A1418] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileInGroup(false)}
                    aria-label="Back to groups list"
                    className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-charcoal dark:hover:text-[#EDE8EC]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-xs"
                    style={{ backgroundColor: activeGroup.accentColor }}
                  >
                    {activeGroup.monogram}
                  </div>
                  <div>
                    <h2 className="font-semibold text-[14px] text-charcoal dark:text-[#EDE8EC]">
                      {activeGroup.name}
                    </h2>
                    <p className="text-[11.5px] text-muted">
                      {activeGroup.memberCount} members · {activeGroup.topic}
                    </p>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 md:pb-6 space-y-4">
                <div className="mx-auto max-w-sm rounded-xl border border-stone-subtle dark:border-white/10 bg-porcelain/60 dark:bg-white/[0.04] p-3 text-center text-[12px] text-muted">
                  <p>Viewing sample collaboration in <span className="font-semibold text-charcoal dark:text-[#EDE8EC]">{activeGroup.name}</span>.</p>
                </div>

                {activeGroup.messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <UserAvatar
                      id={m.senderName}
                      display_name={m.senderName}
                      avatar_url={getDeterministicDemoAvatar(m.senderName)}
                      size="xs"
                      className="shrink-0"
                    />
                    <div className="max-w-[85%] rounded-2xl border border-stone/80 dark:border-white/[0.08] bg-porcelain dark:bg-[#1A1418] px-4 py-2.5 text-[13.5px]">
                      <div className="flex items-center justify-between gap-3 text-[11px] mb-1">
                        <span className="font-medium text-xs text-charcoal dark:text-[#EDE8EC]">{m.senderName}</span>
                      </div>
                      <p className="text-charcoal dark:text-[#DDD7DC] leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          </div>
        )}

        {/* 4. SETTINGS & APPEARANCE TAB */}
        {activeTab === 'settings' && (
          <main
            className="flex-1 overflow-y-auto p-4 sm:p-8 pb-28 md:pb-8 nx-fade-in"
            style={{ backgroundColor: 'var(--background)' }}
          >
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-foreground">
                    Settings & Appearance
                  </h1>
                  <p className="text-xs text-muted mt-0.5">
                    Select your visual theme and customize your reading rhythm.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-wine/10 text-wine dark:text-[#F3B3C2] border border-wine/20">
                    Live Demo Mode
                  </span>
                </div>
              </div>
              <AppearanceSection />
            </div>
          </main>
        )}
      </div>

      {/* ── Mobile Floating Liquid Glass Pill Dock (Demo) ──────────────────── */}
      {/* Arrangement: Messages — Communities — [ + ] — Groups — Settings */}
      <nav
        aria-label="Demo Mobile Navigation"
        className={cn(
          'fixed z-40 md:hidden transition-all duration-200 ease-out',
          'bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-6 sm:right-6 max-w-md mx-auto',
          mobileInChat && 'hidden pointer-events-none opacity-0 translate-y-4'
        )}
      >
        <div className="liquid-glass-dock relative flex items-center justify-between h-[62px] px-2.5 rounded-[32px] shadow-2xl">
          {/* 1. Messages */}
          <button
            type="button"
            data-demo-tab="messages"
            onClick={() => {
              setActiveTab('messages');
              setMobileInChat(false);
            }}
            aria-current={activeTab === 'messages' ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              activeTab === 'messages'
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                activeTab === 'messages'
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <MessageSquare className="h-4.5 w-4.5" strokeWidth={activeTab === 'messages' ? 2.2 : 1.8} />
            </div>
            <span className={activeTab === 'messages' ? 'font-semibold' : 'font-normal'}>Messages</span>
          </button>

          {/* 2. Communities */}
          <button
            type="button"
            data-demo-tab="communities"
            onClick={() => {
              setActiveTab('communities');
              setMobileInChat(false);
            }}
            aria-current={activeTab === 'communities' ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              activeTab === 'communities'
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                activeTab === 'communities'
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <Globe className="h-4.5 w-4.5" strokeWidth={activeTab === 'communities' ? 2.2 : 1.8} />
            </div>
            <span className={activeTab === 'communities' ? 'font-semibold' : 'font-normal'}>Communities</span>
          </button>

          {/* 3. Raised Centred [ + ] Floating Action Button Jewel */}
          <div className="flex flex-col items-center justify-center px-1">
            <button
              type="button"
              onClick={() => setDemoCreateSheetOpen(true)}
              aria-label="Start or discover (New chat, people, groups, communities)"
              className="liquid-glass-jewel relative -mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white ring-4 ring-porcelain dark:ring-[#231B20] transition-all duration-150 active:scale-90 hover:scale-105"
            >
              <Plus className="h-6 w-6 transition-transform duration-160 group-active:rotate-45" strokeWidth={2.4} />
              <span className="sr-only">Start or Discover</span>
            </button>
            <span className="text-[9.5px] font-medium text-muted mt-0.5 select-none">Create</span>
          </div>

          {/* 4. Groups */}
          <button
            type="button"
            data-demo-tab="groups"
            onClick={() => {
              setActiveTab('groups');
              setMobileInChat(false);
            }}
            aria-current={activeTab === 'groups' ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              activeTab === 'groups'
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                activeTab === 'groups'
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <Layers className="h-4.5 w-4.5" strokeWidth={activeTab === 'groups' ? 2.2 : 1.8} />
            </div>
            <span className={activeTab === 'groups' ? 'font-semibold' : 'font-normal'}>Groups</span>
          </button>

          {/* 5. Settings */}
          <button
            type="button"
            data-demo-tab="settings"
            onClick={() => {
              setActiveTab('settings');
              setMobileInChat(false);
            }}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] tracking-tight transition-all duration-150 active:scale-90',
              activeTab === 'settings'
                ? 'text-wine dark:text-[#F3B3C2] font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] font-normal hover:text-charcoal dark:hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                activeTab === 'settings'
                  ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]'
                  : 'text-[#71717A] dark:text-[#A1A1AA]'
              )}
            >
              <Settings className="h-4.5 w-4.5" strokeWidth={activeTab === 'settings' ? 2.2 : 1.8} />
            </div>
            <span className={activeTab === 'settings' ? 'font-semibold' : 'font-normal'}>Settings</span>
          </button>
        </div>
      </nav>

      {/* ── Demo Start or Discover Action Sheet ───────────────────────────── */}
      <DemoActionSheet
        open={demoCreateSheetOpen}
        onClose={() => setDemoCreateSheetOpen(false)}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setMobileInChat(false);
        }}
        onOpenCommand={() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
        }}
      />

      {/* ── Accessible Echo Note Modal in Demo Mode ──────────────────────────── */}
      {demoEchoModalTarget && (
        <EchoNoteModal
          isOpen={Boolean(demoEchoModalTarget)}
          message={demoEchoModalTarget}
          existingNote={
            demoEchoes.find((e) => e.messageId === demoEchoModalTarget.id)?.note || ''
          }
          isEchoed={demoEchoes.some((e) => e.messageId === demoEchoModalTarget.id)}
          onSave={handleSaveDemoEcho}
          onUnsave={handleUnsaveDemoEcho}
          onClose={() => setDemoEchoModalTarget(null)}
        />
      )}

      {/* ── Cinematic Nexus Moments Story Viewer Overlay ──────────────────── */}
      {selectedStatusProfileId && (
        <DemoStatusViewer
          profiles={DEMO_STATUS_PROFILES}
          initialProfileId={selectedStatusProfileId}
          onClose={() => setSelectedStatusProfileId(null)}
          onMarkProfileViewed={handleMarkProfileViewed}
          onOpenProfile={handleOpenLivingProfile}
          onOpenConversation={(cId) => {
            setActiveTab('messages');
            handleSelectContact(cId);
          }}
        />
      )}

      {/* ── Living Profile Experience Overlay (Phase 9 & Phase 10) ────────── */}
      {selectedLivingContactId && (() => {
        const profile = getLivingProfileByContactId(selectedLivingContactId);
        if (!profile) return null;
        return (
          <DemoLivingProfileView
            profile={profile}
            onClose={handleCloseLivingProfile}
            onStartConversation={handleStartConversationFromProfile}
            onOpenStories={handleOpenStoriesFromProfile}
            onSelectGroup={(groupId) => {
              handleCloseLivingProfile();
              setActiveTab('groups');
              handleSelectGroup(groupId);
            }}
            onNavigateProfile={(contactId) => {
              setSelectedLivingContactId(contactId);
            }}
          />
        );
      })()}

      {/* Contact Context Menu (Right-Click Desktop / Press-and-Hold Mobile) */}
      {contextMenu && (() => {
        const targetContact = contacts.find((c) => c.id === contextMenu.contactId);
        if (!targetContact) return null;

        const menuWidth = 200;
        const menuHeight = 110;
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 400;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const posX = Math.max(12, Math.min(contextMenu.x, screenW - menuWidth - 12));
        const posY = Math.max(12, Math.min(contextMenu.y, screenH - menuHeight - 12));

        return (
          <>
            {/* Transparent backdrop to catch outside clicks and dismiss */}
            <div
              className="fixed inset-0 z-50 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />

            {/* Menu Panel */}
            <div
              role="menu"
              aria-label={`Options for ${targetContact.name}`}
              style={{ left: `${posX}px`, top: `${posY}px` }}
              className="fixed z-50 min-w-[200px] rounded-2xl bg-white/95 dark:bg-[#201B22]/95 backdrop-blur-xl border border-stone-subtle/80 dark:border-white/10 shadow-2xl p-1.5 nx-popover-enter select-none text-charcoal dark:text-stone"
            >
              {/* Header / Contact Identifier */}
              <div className="px-2.5 py-1.5 border-b border-stone-subtle/40 dark:border-white/[0.06] mb-1">
                <p className="text-[12px] font-semibold text-charcoal dark:text-stone truncate">
                  {targetContact.name}
                </p>
              </div>

              {/* Action 1: Pin / Unpin */}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  handleTogglePinContact(targetContact.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-charcoal dark:text-stone hover:bg-wine/10 dark:hover:bg-white/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
              >
                {targetContact.isPinned ? (
                  <>
                    <PinOff className="h-4 w-4 text-wine dark:text-[#F3B3C2]" />
                    <span>Unpin conversation</span>
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 text-wine dark:text-[#F3B3C2] fill-wine/20 dark:fill-[#F3B3C2]/20" />
                    <span>Pin conversation</span>
                  </>
                )}
                <span className="ml-auto text-[10.5px] font-mono text-muted/70">P</span>
              </button>

              {/* Action 2: Toggle Unread */}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setContacts((prev) =>
                    prev.map((c) =>
                      c.id === targetContact.id
                        ? { ...c, unreadCount: c.unreadCount > 0 ? 0 : 1 }
                        : c
                    )
                  );
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-charcoal dark:text-stone hover:bg-wine/10 dark:hover:bg-white/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>{targetContact.unreadCount > 0 ? 'Mark as read' : 'Mark as unread'}</span>
              </button>
            </div>
          </>
        );
      })()}

      {/* Outgoing Call Interface */}
      {demoCallType && (
        <CallModal
          isOpen={Boolean(demoCallType)}
          onClose={() => setDemoCallType(null)}
          callType={demoCallType}
          recipient={{
            name: activeContact.name,
            username: activeContact.handle,
            id: activeContact.id,
            subtitle: activeContact.subtitle || activeContact.statusText,
            avatarUrl: activeContact.avatarUrl,
            isCreator: activeContact.isCreator,
          }}
        />
      )}
    </div>
  );
}

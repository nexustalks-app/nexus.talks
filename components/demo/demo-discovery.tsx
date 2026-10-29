'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Users,
  Layers,
  ExternalLink,
  BookOpen,
  Eye,
  CheckCircle2,
  Circle,
  X,
  Share2,
  Check,
  ChevronRight,
  Volume2,
  Clock,
  HeartHandshake,
  Feather,
  Info,
} from 'lucide-react';
import {
  DEMO_CONTACTS,
  DEMO_STATUS_PROFILES,
  DEMO_GROUPS,
  type DemoContact,
  type DemoGroup,
  type DemoStatusProfile,
} from './demo-data';
import {
  DISCOVERY_GRAPH,
  getDiscoveryConnections,
  type DiscoveryConnection,
  type ExplorerProgress,
} from './demo-discovery-graph';
import { NexusAvatar3D } from '@/components/user/nexus-avatar-3d';
import { UserAvatar } from '@/components/user/user-avatar';
import { cn } from '@/lib/utils/cn';

interface DemoDiscoveryProps {
  onOpenLivingProfile: (contactId: string) => void;
  onOpenStories: (statusProfileId: string) => void;
  onSelectContact: (contactId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onReturnToMessages: () => void;
  explorerProgress: ExplorerProgress;
  onUpdateProgress: (updater: (prev: ExplorerProgress) => ExplorerProgress) => void;
}

export function DemoDiscoveryView({
  onOpenLivingProfile,
  onOpenStories,
  onSelectContact,
  onSelectGroup,
  onReturnToMessages,
  explorerProgress,
  onUpdateProgress,
}: DemoDiscoveryProps) {
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string>('contact-aasif');
  const [isJourneyMinimized, setIsJourneyMinimized] = useState(false);
  const [showSecretNote, setShowSecretNote] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [craftFilter, setCraftFilter] = useState<string>('all');

  // Compute journey progress
  const milestones = [
    {
      id: 'contacts',
      label: 'Meet 3 demo contacts',
      done: explorerProgress.visitedContacts.length >= 3,
      current: `${Math.min(explorerProgress.visitedContacts.length, 3)}/3`,
    },
    {
      id: 'story',
      label: 'Watch a Nexus Moment',
      done: explorerProgress.openedStoryCount > 0,
      current: explorerProgress.openedStoryCount > 0 ? 'Watched' : '0/1',
    },
    {
      id: 'profile',
      label: 'Explore a Living Profile',
      done: explorerProgress.viewedLivingProfileCount > 0,
      current: explorerProgress.viewedLivingProfileCount > 0 ? 'Explored' : '0/1',
    },
    {
      id: 'group',
      label: 'Enter a collaboration group',
      done: explorerProgress.enteredGroupCount > 0,
      current: explorerProgress.enteredGroupCount > 0 ? 'Visited' : '0/1',
    },
    {
      id: 'creator',
      label: "Visit The Creator's Corner",
      done: explorerProgress.visitedCreatorCorner,
      current: explorerProgress.visitedCreatorCorner ? 'Discovered' : 'Pending',
    },
  ];

  const completedCount = milestones.filter((m) => m.done).length;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRevealSecretNote = () => {
    setShowSecretNote(true);
    onUpdateProgress((prev) => ({
      ...prev,
      discoveredSecretNote: true,
    }));
  };

  const activeGraphNode = DISCOVERY_GRAPH[selectedGraphNodeId] || DISCOVERY_GRAPH['contact-aasif'];
  const activeConnections = activeGraphNode.connections;

  // Curated Craft Highlights
  const CRAFT_HIGHLIGHTS = [
    {
      id: 'hl-aasif-sound',
      author: 'Aasif',
      authorId: 'contact-aasif',
      tag: 'Sound Design & UI',
      title: 'Acoustic UI & Resonant Notifications',
      excerpt: 'Subtle percussive clicks and acoustic chimes crafted to avoid anxiety-inducing push alerts.',
      date: 'Autumn 2026',
      accentColor: '#542C38',
      type: 'profile' as const,
    },
    {
      id: 'hl-elena-pavilion',
      author: 'Elena Rostova',
      authorId: 'contact-elena',
      tag: 'Architecture',
      title: 'Brutalist Gallery Pavilion Daylight Study',
      excerpt: 'Investigating how high-contrast chiaroscuro vestibules prepare the visitor for contemplation.',
      date: 'October 2026',
      accentColor: '#542C38',
      type: 'profile' as const,
    },
    {
      id: 'hl-marcus-type',
      author: 'Marcus Vance',
      authorId: 'contact-marcus',
      tag: 'Typography',
      title: 'Vance Specimen Vol. 4: Quiet Proportions',
      excerpt: 'Balancing optical font sizes so long-form reading feels natural on both handhelds and wide monitors.',
      date: 'September 2026',
      accentColor: '#6A3947',
      type: 'profile' as const,
    },
    {
      id: 'hl-amara-sync',
      author: 'Amara Okafor',
      authorId: 'contact-amara',
      tag: 'Local-First',
      title: 'Sub-15ms Latency State Engine',
      excerpt: 'Optimistic local transactions guaranteeing that message dispatch never waits on network roundtrips.',
      date: 'October 2026',
      accentColor: '#292628',
      type: 'profile' as const,
    },
    {
      id: 'hl-sophia-rain',
      author: 'Sophia Lin',
      authorId: 'contact-sophia',
      tag: 'Acoustics',
      title: 'Binaural Rain & Moss Audio Synthesis',
      excerpt: 'Generative procedural rain sounds that dynamically shift resonance based on nocturnal hours.',
      date: 'October 2026',
      accentColor: '#542C38',
      type: 'profile' as const,
    },
    {
      id: 'hl-julian-clock',
      author: 'Julian Thorne',
      authorId: 'contact-julian',
      tag: 'Horology',
      title: 'Calibre 38 Escapement & Stillness Study',
      excerpt: 'Parallels between physical gear trains and cognitive focus: why intentional friction prevents digital fatigue.',
      date: 'August 2026',
      accentColor: '#21191D',
      type: 'profile' as const,
    },
  ];

  const filteredHighlights = craftFilter === 'all'
    ? CRAFT_HIGHLIGHTS
    : CRAFT_HIGHLIGHTS.filter((h) => h.tag.toLowerCase().includes(craftFilter.toLowerCase()));

  return (
    <main
      aria-label="Nexus Discovery Experience"
      className="flex-1 overflow-y-auto bg-porcelain dark:bg-[#150F13] text-charcoal dark:text-foreground no-scrollbar"
    >
      {/* ── Top Atmospheric Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-stone/80 dark:border-white/10 bg-gradient-to-b from-white via-porcelain to-stone/20 dark:from-[#1E151B] dark:via-[#171015] dark:to-[#120B0E] px-5 sm:px-8 pt-8 pb-10">
        {/* Ambient background glow */}
        <div className="absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-wine/10 dark:bg-wine/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-[#A77982]/10 dark:bg-[#A77982]/15 blur-2xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-strong/50 dark:border-white/15 bg-white/90 dark:bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-wine dark:text-[#F3B3C2] shadow-xs">
              <Compass className="h-3.5 w-3.5" />
              <span>Nexus Discovery &middot; Living Network</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-xl border border-stone dark:border-white/10 bg-white/80 dark:bg-white/10 px-3 py-1.5 text-xs font-medium text-charcoal dark:text-stone hover:bg-stone/30 transition-all active:scale-95"
                title="Copy demo link"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
              </button>

              <button
                type="button"
                onClick={onReturnToMessages}
                className="flex items-center gap-1.5 rounded-xl bg-wine hover:bg-wine-hover text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 border-t border-white/20"
                aria-label="Return to messaging"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Return to Messages</span>
              </button>
            </div>
          </div>

          {/* Hero Editorial Headline */}
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-charcoal dark:text-white leading-[1.15]">
              An interconnected world of quiet craft, thought, and conversation.
            </h1>
            <p className="mt-3.5 text-base sm:text-lg text-muted dark:text-stone/90 leading-relaxed font-sans">
              Follow the threads between the people who build, write, and curate here. Every contact, moment, profile, and salon connects into a coherent digital sanctuary.
            </p>
          </div>

          {/* Quick Navigation Anchor Pills */}
          <div className="mt-8 flex flex-wrap items-center gap-2 pt-4 border-t border-stone-subtle dark:border-white/10 text-xs">
            <span className="font-semibold text-muted mr-1">Jump to:</span>
            <a
              href="#creator-corner"
              className="rounded-lg bg-stone/40 dark:bg-white/10 px-3 py-1 font-medium hover:bg-wine/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
            >
              Creator&apos;s Corner
            </a>
            <a
              href="#meet-the-people"
              className="rounded-lg bg-stone/40 dark:bg-white/10 px-3 py-1 font-medium hover:bg-wine/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
            >
              Meet the People
            </a>
            <a
              href="#nexus-moments"
              className="rounded-lg bg-stone/40 dark:bg-white/10 px-3 py-1 font-medium hover:bg-wine/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
            >
              Nexus Moments
            </a>
            <a
              href="#conversation-room"
              className="rounded-lg bg-stone/40 dark:bg-white/10 px-3 py-1 font-medium hover:bg-wine/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
            >
              The Conversation Room
            </a>
            <a
              href="#relationship-graph"
              className="rounded-lg bg-stone/40 dark:bg-white/10 px-3 py-1 font-medium hover:bg-wine/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
            >
              Connected Graph
            </a>
            <a
              href="#creative-archives"
              className="rounded-lg bg-stone/40 dark:bg-white/10 px-3 py-1 font-medium hover:bg-wine/10 hover:text-wine dark:hover:text-[#F3B3C2] transition-colors"
            >
              Creative Archives
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-12">
        {/* ── Section 1: Optional Explorer Journey (Guide) ───────────────── */}
        <section
          aria-label="Discovery Journey Progress"
          className="rounded-2xl border border-wine/20 dark:border-white/15 bg-white dark:bg-[#1D141A] p-5 shadow-sm transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine/10 text-wine dark:bg-wine/30 dark:text-[#F3B3C2]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-charcoal dark:text-white">
                  Your Discovery Journey
                </h2>
                <p className="text-xs text-muted">
                  Follow subtle threads across the demo &middot; {completedCount} of {milestones.length} unlocked
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-mono font-semibold text-wine dark:text-[#F3B3C2]">
                {Math.round((completedCount / milestones.length) * 100)}% Discovered
              </span>
              <button
                type="button"
                onClick={() => setIsJourneyMinimized((prev) => !prev)}
                className="text-xs text-muted hover:text-charcoal dark:hover:text-white underline underline-offset-2"
              >
                {isJourneyMinimized ? 'Expand Guide' : 'Minimize'}
              </button>
            </div>
          </div>

          {!isJourneyMinimized && (
            <div className="mt-4 pt-4 border-t border-stone-subtle dark:border-white/10">
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-stone-subtle dark:bg-white/10 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-wine to-[#A77982] transition-all duration-500 ease-out"
                  style={{ width: `${(completedCount / milestones.length) * 100}%` }}
                />
              </div>

              {/* Milestone items grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-3 py-2 text-xs border transition-colors',
                      m.done
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-charcoal dark:text-white'
                        : 'border-stone-subtle dark:border-white/5 bg-porcelain/60 dark:bg-white/5 text-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {m.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted/50 shrink-0" />
                      )}
                      <span className={cn('font-medium', m.done && 'font-semibold')}>
                        {m.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono opacity-80">{m.current}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Section 2: The Creator's Corner (Section 6) ─────────────────── */}
        <section
          id="creator-corner"
          aria-label="The Creator's Corner"
          className="relative overflow-hidden rounded-3xl border border-wine/30 dark:border-wine/40 bg-gradient-to-br from-[#27151D] via-[#1C1117] to-[#120B0E] text-white p-6 sm:p-8 shadow-xl"
        >
          {/* Subtle lighting overlay */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-wine/25 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#F3B3C2] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-wine" />
                <span>The Creator&apos;s Corner &middot; Architectural Direction</span>
              </div>

              <span className="text-[11px] font-mono text-white/60 tracking-wider">
                ORIGINAL SIGNATURE EXPERIENCE
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Creator Bio & Intent */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-wine text-white font-serif font-bold text-2xl shadow-lg border-2 border-white/20">
                      A
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#1C1117]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold font-serif text-white tracking-tight">
                        Aasif
                      </h2>
                      <span className="rounded-full bg-wine/60 border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        Creator
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#F3B3C2] mt-0.5">
                      @the_aasif9 &middot; Creator of Nexus.talks
                    </p>
                  </div>
                </div>

                <blockquote className="font-serif text-lg sm:text-xl text-white/95 italic leading-relaxed border-l-2 border-wine pl-4 pt-1">
                  &ldquo;I didn&apos;t build this just to send messages. I wanted to build something people would actually want to explore. Quiet digital sanctuaries where dialogue has weight, elegance, and stillness.&rdquo;
                </blockquote>

                <p className="text-xs sm:text-sm text-stone/80 leading-relaxed font-sans">
                  Nexus.talks rejects algorithmic feeds, engagement traps, and anxiety-inducing notification badges. Every token—from the tactile Wine &amp; Porcelain palette to the acoustic notification sounds—was designed to make conversations feel genuinely human again.
                </p>

                {/* Creator Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProgress((prev) => ({ ...prev, visitedCreatorCorner: true }));
                      onOpenLivingProfile('contact-aasif');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-charcoal hover:bg-porcelain px-4 py-2.5 text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95"
                  >
                    <Eye className="h-4 w-4 text-wine" />
                    <span>Explore Aasif&apos;s Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProgress((prev) => ({ ...prev, visitedCreatorCorner: true }));
                      onOpenStories('status-aasif');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white px-4 py-2.5 text-xs font-bold border border-white/20 shadow-md transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Watch Creator Stories</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProgress((prev) => ({ ...prev, visitedCreatorCorner: true }));
                      onSelectContact('contact-aasif');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-medium border border-white/15 transition-all hover:scale-105 active:scale-95"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Message Aasif</span>
                  </button>

                  <a
                    href="https://www.instagram.com/the_aasif9/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onUpdateProgress((prev) => ({ ...prev, visitedCreatorCorner: true }))}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#E1306C]/80 hover:bg-[#E1306C] text-white px-4 py-2.5 text-xs font-bold border border-white/20 shadow-md transition-all hover:scale-105 active:scale-95"
                  >
                    <span>Say hi on Instagram (@the_aasif9)</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Creator Principles Card & Brand Signature */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3B3C2]">
                    Architectural Tenets
                  </h3>

                  <ul className="space-y-2.5 text-xs text-white/85">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-wine text-sm leading-none">&bull;</span>
                      <span><strong>Quiet Typography:</strong> High-contrast serif headlines paired with unhurried body type for cognitive rest.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-wine text-sm leading-none">&bull;</span>
                      <span><strong>Tactile Feedback:</strong> Subtle micro-interactions and glass refraction tokens that breathe with intention.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-wine text-sm leading-none">&bull;</span>
                      <span><strong>Sub-15ms Latency:</strong> Local-first optimistic state ensuring messaging feels instantaneous.</span>
                    </li>
                  </ul>

                  {/* Brand Signature Card */}
                  <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-wine text-white font-serif font-bold text-xs">
                        N
                      </div>
                      <span className="font-bold tracking-widest text-[11px] text-white/90">
                        POWERED BY AASIF
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[#F3B3C2]/80">
                      Nexus.talks &middot; v10
                    </span>
                  </div>
                </div>

                {/* Discoverable Secret Creator Note */}
                {!showSecretNote ? (
                  <button
                    type="button"
                    onClick={handleRevealSecretNote}
                    className="w-full text-left rounded-xl border border-dashed border-white/25 bg-white/5 hover:bg-white/10 p-3 flex items-center justify-between transition-colors text-xs text-stone"
                  >
                    <span className="flex items-center gap-2">
                      <Feather className="h-3.5 w-3.5 text-[#F3B3C2]" />
                      <span>Discover Aasif&apos;s Private Note on Stillness</span>
                    </span>
                    <span className="text-[10px] font-mono text-white/50">Click to unfold</span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-wine/40 bg-wine/20 p-4 text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-[#F3B3C2] font-semibold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Feather className="h-3.5 w-3.5" />
                        <span>A Private Note on Digital Stillness</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSecretNote(false)}
                        className="text-white/60 hover:text-white"
                        aria-label="Close note"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-white/90 leading-relaxed italic">
                      &ldquo;When you build software for conversations, you are building spaces where people reveal their interior worlds. If the interface screams with flashing red badges, the mind contracts. When the interface is quiet, thoughts unfold with honesty.&rdquo;
                    </p>
                    <p className="text-right text-[10.5px] font-mono text-[#F3B3C2]">
                      — Aasif (@the_aasif9)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Meet the People (Pathway 1) ──────────────────────── */}
        <section id="meet-the-people" aria-label="Meet the People">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-stone bg-white dark:bg-white/10 px-3 py-0.5 text-xs text-muted mb-1.5">
                <Users className="h-3.5 w-3.5 text-wine" />
                <span>Curated Demo Residents</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-white">
                Meet the People
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1">
                Six creative identities framing architecture, typography, sound, and local-first systems.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_CONTACTS.map((contact) => {
              const hasStories = contact.id === 'contact-aasif' || contact.id === 'contact-elena' || contact.id === 'contact-marcus' || contact.id === 'contact-amara';
              const statusId = contact.id === 'contact-aasif'
                ? 'status-aasif'
                : contact.id === 'contact-elena'
                ? 'status-elena'
                : contact.id === 'contact-marcus'
                ? 'status-marcus'
                : contact.id === 'contact-amara'
                ? 'status-amara'
                : null;

              return (
                <div
                  key={contact.id}
                  className="rounded-2xl border border-stone/80 dark:border-white/[0.08] bg-white dark:bg-[#1A1418] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Avatar + Story Ring */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="relative">
                        <div
                          className={cn(
                            'p-[1.5px] rounded-full transition-transform',
                            hasStories
                              ? 'bg-gradient-to-tr from-[#7A223B] via-[#943851] to-[#D48B9B] dark:from-[#B84564] dark:via-[#D16B85] dark:to-[#E8B8C4] cursor-pointer hover:scale-105'
                              : 'bg-stone-strong/40 dark:bg-white/15'
                          )}
                          onClick={() => {
                            if (statusId) {
                              onUpdateProgress((prev) => ({
                                ...prev,
                                openedStoryCount: prev.openedStoryCount + 1,
                              }));
                              onOpenStories(statusId);
                            }
                          }}
                          title={hasStories ? 'Click to view stories' : undefined}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full p-[1.5px] bg-white dark:bg-[#1A1418]">
                            <div className="relative h-full w-full rounded-full overflow-hidden shadow-2xs">
                              <UserAvatar
                                id={contact.id}
                                display_name={contact.name}
                                avatar_url={contact.avatarUrl}
                                size="md"
                                className="h-full w-full"
                                showCreatorBadge={contact.isCreator}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {contact.isCreator && (
                          <span className="rounded-full bg-wine/10 dark:bg-wine/30 text-wine dark:text-[#F3B3C2] font-semibold text-[10.5px] px-2.5 py-0.5 border border-wine/20">
                            Creator
                          </span>
                        )}
                        <span className="rounded-full bg-stone-subtle dark:bg-white/5 text-muted text-[10.5px] px-2 py-0.5">
                          {contact.status === 'online' ? '● Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Name & Handle */}
                    <div className="mt-3.5">
                      <h3 className="font-medium text-[15px] text-charcoal dark:text-[#EDE8EC] group-hover:text-wine dark:group-hover:text-[#F3B3C2] transition-colors">
                        {contact.name}
                      </h3>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        @{contact.handle}
                      </p>
                    </div>

                    {/* Subtitle / Focus */}
                    <p className="mt-2 text-xs text-charcoal/80 dark:text-stone/90 line-clamp-2 leading-relaxed">
                      {contact.subtitle || contact.statusText}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3.5 border-t border-stone-subtle dark:border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateProgress((prev) => ({
                          ...prev,
                          viewedLivingProfileCount: prev.viewedLivingProfileCount + 1,
                          visitedContacts: Array.from(new Set([...prev.visitedContacts, contact.id])),
                        }));
                        onOpenLivingProfile(contact.id);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-porcelain dark:bg-white/10 hover:bg-stone/30 dark:hover:bg-white/15 px-3 py-2 text-xs font-semibold text-charcoal dark:text-white transition-all active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5 text-wine" />
                      <span>Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateProgress((prev) => ({
                          ...prev,
                          visitedContacts: Array.from(new Set([...prev.visitedContacts, contact.id])),
                        }));
                        onSelectContact(contact.id);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-wine hover:bg-wine-hover text-white px-3 py-2 text-xs font-bold transition-all active:scale-95 border-t border-white/20"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 4: Nexus Moments Showcase (Pathway 2) ───────────────── */}
        <section id="nexus-moments" aria-label="Nexus Moments Showcase">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-stone bg-white dark:bg-white/10 px-3 py-0.5 text-xs text-muted mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-wine" />
                <span>Ephemera &amp; Narrative</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-white">
                Nexus Moments
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1">
                Fictional stories that illustrate architectural intent, typographic experiments, and local-first craft.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_STATUS_PROFILES.map((profile) => {
              const firstStory = profile.stories[0];
              if (!firstStory) return null;

              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    onUpdateProgress((prev) => ({
                      ...prev,
                      openedStoryCount: prev.openedStoryCount + 1,
                    }));
                    onOpenStories(profile.id);
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-stone/80 dark:border-white/10 bg-gradient-to-br from-[#27151D] via-[#1B1116] to-[#120B0E] p-5 text-white shadow-xs hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between min-h-[220px]"
                >
                  {/* Atmospheric Glow */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-wine/20 blur-2xl rounded-full pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border border-white/20 shadow-xs shrink-0">
                          <UserAvatar
                            id={profile.id}
                            display_name={profile.name}
                            avatar_url={profile.avatarUrl}
                            size="sm"
                            className="!h-full !w-full"
                            showCreatorBadge={profile.isCreator}
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">
                            {profile.name}
                          </h3>
                          <p className="text-[11px] font-mono text-[#F3B3C2]/80">
                            {profile.username}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-white/50">
                        {profile.stories.length} stories
                      </span>
                    </div>

                    <div className="mt-4">
                      {firstStory.tagline && (
                        <span className="inline-block text-[10.5px] font-semibold text-[#F3B3C2] tracking-wide mb-1.5">
                          {firstStory.tagline}
                        </span>
                      )}
                      <p className="font-serif text-sm sm:text-base text-white/90 leading-snug line-clamp-3 italic">
                        {firstStory.content}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#F3B3C2] font-semibold">
                    <span className="flex items-center gap-1">
                      <span>Watch Story</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-[10.5px] font-mono text-white/40">
                      {firstStory.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 5: The Connected Discovery Graph Explorer (Section 4) ── */}
        <section
          id="relationship-graph"
          aria-label="Connected Discovery Graph Explorer"
          className="rounded-3xl border border-stone/80 dark:border-white/15 bg-white dark:bg-[#1C141A] p-6 sm:p-8 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-stone bg-porcelain dark:bg-white/10 px-3 py-0.5 text-xs text-muted mb-1.5">
                <Layers className="h-3.5 w-3.5 text-wine" />
                <span>Relational Core &middot; Section 4</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-white">
                Connected Discovery Graph
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1">
                Select an entity to reveal its organic connections across Living Profiles, Moments, and Collaboration Groups.
              </p>
            </div>
          </div>

          {/* Node Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-5 border-b border-stone-subtle dark:border-white/10">
            {Object.entries(DISCOVERY_GRAPH).map(([nodeId, node]) => {
              const isSelected = nodeId === selectedGraphNodeId;
              return (
                <button
                  key={nodeId}
                  type="button"
                  onClick={() => setSelectedGraphNodeId(nodeId)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95',
                    isSelected
                      ? 'bg-wine text-white shadow-sm border-t border-white/20'
                      : 'bg-porcelain dark:bg-white/5 text-charcoal dark:text-stone hover:bg-stone/30'
                  )}
                >
                  <span>{node.title}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                      isSelected ? 'bg-white/20 text-white' : 'bg-stone-subtle text-muted'
                    )}
                  >
                    {node.connections.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Node View & Outgoing Connections Grid */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3 bg-stone-subtle/50 dark:bg-white/5 rounded-2xl p-4">
              <div>
                <span className="text-[10.5px] font-mono uppercase text-muted tracking-wider">
                  Active Entity Focus
                </span>
                <h3 className="text-lg font-bold text-charcoal dark:text-white">
                  {activeGraphNode.title}
                </h3>
                <p className="text-xs text-muted">{activeGraphNode.subtitle}</p>
              </div>

              <span className="rounded-full bg-wine/10 dark:bg-wine/30 text-wine dark:text-[#F3B3C2] px-3 py-1 text-xs font-semibold">
                {activeGraphNode.category}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {activeConnections.map((conn) => {
                const handleClick = () => {
                  if (conn.targetType === 'contact') {
                    onSelectContact(conn.targetId);
                  } else if (conn.targetType === 'profile') {
                    onOpenLivingProfile(conn.targetId);
                  } else if (conn.targetType === 'story') {
                    onOpenStories(conn.targetId);
                  } else if (conn.targetType === 'group') {
                    onSelectGroup(conn.targetId);
                  } else if (conn.targetType === 'external' && conn.externalUrl) {
                    window.open(conn.externalUrl, '_blank', 'noopener,noreferrer');
                  }
                };

                return (
                  <div
                    key={conn.id}
                    className="rounded-2xl border border-stone/80 dark:border-white/10 bg-porcelain/40 dark:bg-white/5 p-4 flex flex-col justify-between hover:border-wine/30 dark:hover:border-white/20 hover:shadow-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[10.5px] mb-2">
                        <span className="font-semibold text-wine dark:text-[#F3B3C2]">
                          {conn.categoryLabel}
                        </span>
                        {conn.badge && (
                          <span className="rounded-full bg-stone dark:bg-white/10 px-2 py-0.5 text-charcoal dark:text-white font-mono text-[10px]">
                            {conn.badge}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-charcoal dark:text-white">
                        {conn.title}
                      </h4>
                      {conn.subtitle && (
                        <p className="text-[11px] font-mono text-muted mt-0.5">
                          {conn.subtitle}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-charcoal/80 dark:text-stone/90 leading-relaxed">
                        {conn.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-subtle dark:border-white/10">
                      <button
                        type="button"
                        onClick={handleClick}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-stone/30 dark:hover:bg-white/20 px-3 py-2 text-xs font-bold text-charcoal dark:text-white border border-stone/80 dark:border-white/10 transition-all active:scale-95 shadow-xs"
                      >
                        <span>{conn.actionLabel}</span>
                        {conn.targetType === 'external' ? (
                          <ExternalLink className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5 text-wine" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 6: The Conversation Room (Pathway 3) ────────────────── */}
        <section id="conversation-room" aria-label="The Conversation Room">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-stone bg-white dark:bg-white/10 px-3 py-0.5 text-xs text-muted mb-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-wine" />
                <span>Salons &amp; Working Groups</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-white">
                The Conversation Room
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1">
                Enter simulated groups where residents exchange midnight ideas, review layout tokens, and draft essays.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DEMO_GROUPS.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-stone/80 dark:border-white/10 bg-white dark:bg-[#1E161C] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-white font-bold text-sm shadow-xs"
                      style={{ backgroundColor: group.accentColor }}
                    >
                      {group.monogram}
                    </div>
                    <span className="rounded-full bg-stone-subtle dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-muted">
                      {group.memberCount} members
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-bold text-base text-charcoal dark:text-white">
                    {group.name}
                  </h3>
                  <p className="text-xs font-semibold text-wine dark:text-[#F3B3C2] mt-0.5">
                    {group.topic}
                  </p>
                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    {group.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-stone-subtle dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProgress((prev) => ({
                        ...prev,
                        enteredGroupCount: prev.enteredGroupCount + 1,
                      }));
                      onSelectGroup(group.id);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-wine hover:bg-wine-hover text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 border-t border-white/20 shadow-xs"
                  >
                    <span>Enter Group</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 7: Creative Archives & Craft Highlights (Pathway 4) ─── */}
        <section id="creative-archives" aria-label="Creative Archives">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-stone bg-white dark:bg-white/10 px-3 py-0.5 text-xs text-muted mb-1.5">
                <BookOpen className="h-3.5 w-3.5 text-wine" />
                <span>Sample Highlights &amp; Craft Studies</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-white">
                Creative Archives
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1">
                Monographs, acoustic studies, and technical prototypes produced by the residents of Nexus.talks.
              </p>
            </div>

            {/* Discipline Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {['all', 'Architecture', 'Typography', 'Sound', 'Local-First', 'Horology'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCraftFilter(tag === 'all' ? 'all' : tag)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-medium transition-colors',
                    (craftFilter === 'all' && tag === 'all') || craftFilter.toLowerCase() === tag.toLowerCase()
                      ? 'bg-wine text-white'
                      : 'bg-stone/40 dark:bg-white/10 text-muted hover:text-charcoal'
                  )}
                >
                  {tag === 'all' ? 'All Disciplines' : tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHighlights.map((hl) => (
              <div
                key={hl.id}
                className="rounded-2xl border border-stone/80 dark:border-white/10 bg-white dark:bg-[#1E161C] p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-wine/10 dark:bg-wine/30 text-wine dark:text-[#F3B3C2] px-2.5 py-0.5 text-[10.5px] font-semibold">
                      {hl.tag}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {hl.date}
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold text-sm text-charcoal dark:text-white">
                    {hl.title}
                  </h3>
                  <p className="mt-1 text-xs text-charcoal/80 dark:text-stone/90 leading-relaxed">
                    {hl.excerpt}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-stone-subtle dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-muted">By {hl.author}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProgress((prev) => ({
                        ...prev,
                        viewedLivingProfileCount: prev.viewedLivingProfileCount + 1,
                      }));
                      onOpenLivingProfile(hl.authorId);
                    }}
                    className="font-bold text-wine dark:text-[#F3B3C2] hover:underline flex items-center gap-1"
                  >
                    <span>View in Profile</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 8: Atmospheric Footer & Brand Signature ────────────── */}
        <footer className="pt-8 pb-28 sm:pb-12 border-t border-stone/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-wine text-white font-serif font-bold text-xs">
              N
            </div>
            <span className="font-semibold text-charcoal dark:text-white tracking-wider">
              NEXUS.TALKS
            </span>
            <span className="text-stone-strong dark:text-stone/50">&middot;</span>
            <span className="font-bold text-wine dark:text-[#F3B3C2]">
              POWERED BY AASIF
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={onReturnToMessages}
              className="hover:text-charcoal dark:hover:text-white transition-colors"
            >
              Return to Messages
            </button>
            <span>&middot;</span>
            <a
              href="https://www.instagram.com/the_aasif9/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-charcoal dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Creator Instagram</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

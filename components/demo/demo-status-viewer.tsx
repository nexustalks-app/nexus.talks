'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { type DemoStatusProfile } from './demo-data';
import { NexusAvatar3D } from '@/components/user/nexus-avatar-3d';
import { UserAvatar } from '@/components/user/user-avatar';
import { cn } from '@/lib/utils/cn';

interface DemoStatusViewerProps {
  profiles: DemoStatusProfile[];
  initialProfileId: string;
  onClose: () => void;
  onMarkProfileViewed: (profileId: string) => void;
  onOpenProfile?: (contactId: string) => void;
  onOpenConversation?: (contactId: string) => void;
}

const STORY_DURATION_MS = 7000; // 7 seconds per story card

const STATUS_TO_CONTACT_MAP: Record<string, string> = {
  'status-aasif': 'contact-aasif',
  'status-elena': 'contact-elena',
  'status-marcus': 'contact-marcus',
  'status-amara': 'contact-amara',
  'status-brand': 'contact-aasif',
};

export function DemoStatusViewer({
  profiles,
  initialProfileId,
  onClose,
  onMarkProfileViewed,
  onOpenProfile,
  onOpenConversation,
}: DemoStatusViewerProps) {
  const initialIndex = Math.max(
    0,
    profiles.findIndex((p) => p.id === initialProfileId)
  );

  const [currentProfileIndex, setCurrentProfileIndex] = useState(initialIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [progressMs, setProgressMs] = useState(0);

  const activeProfile = profiles[currentProfileIndex];
  const activeStory = activeProfile?.stories[currentStoryIndex];
  const totalStories = activeProfile?.stories.length || 1;

  // Mark profile viewed on mount and when profile changes
  useEffect(() => {
    if (activeProfile) {
      onMarkProfileViewed(activeProfile.id);
    }
  }, [activeProfile, onMarkProfileViewed]);

  // Navigation handlers
  const handleNextStory = useCallback(() => {
    setProgressMs(0);
    if (currentStoryIndex < totalStories - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, totalStories, currentProfileIndex, profiles.length, onClose]);

  const handlePrevStory = useCallback(() => {
    setProgressMs(0);
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentProfileIndex > 0) {
      const prevProfile = profiles[currentProfileIndex - 1];
      setCurrentProfileIndex((prev) => prev - 1);
      setCurrentStoryIndex(Math.max(0, prevProfile.stories.length - 1));
    }
  }, [currentStoryIndex, currentProfileIndex, profiles]);

  // Timer loop for story progress
  useEffect(() => {
    // If reduced motion is requested, do not auto-advance
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isPaused || isHolding || prefersReducedMotion) {
      return;
    }

    const intervalTime = 50; // update progress every 50ms
    const interval = setInterval(() => {
      setProgressMs((prev) => {
        const next = prev + intervalTime;
        if (next >= STORY_DURATION_MS) {
          handleNextStory();
          return 0;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPaused, isHolding, handleNextStory]);

  // Visibility and keyboard shortcuts
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNextStory();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStory();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleNextStory, handlePrevStory]);

  if (!activeProfile || !activeStory) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${activeProfile.name}'s Status Story`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#100A0D]/95 backdrop-blur-2xl text-white select-none animate-fade-in"
    >
      {/* Background Radial Light Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-[600px] w-[600px] rounded-full blur-[130px] opacity-25 -z-10"
        style={{
          backgroundColor: activeStory.accentColor || '#542C38',
        }}
      />

      {/* Main Story Container (Fixed Aspect / Max Width) */}
      <div className="relative w-full h-full max-w-lg md:max-h-[820px] flex flex-col justify-between p-4 sm:p-6 overflow-hidden md:rounded-3xl border border-white/10 glass-surface shadow-2xl bg-gradient-to-b from-[#1C1217]/95 via-[#160E12]/95 to-[#10090D]/95">
        {/* ── Top Bar: Segmented Progress & Author Masthead ──────────────── */}
        <div className="relative z-30 space-y-3 shrink-0">
          {/* Segmented Progress Indicators */}
          <div className="flex items-center gap-1.5 w-full">
            {activeProfile.stories.map((story, idx) => {
              let fillPercent = 0;
              if (idx < currentStoryIndex) {
                fillPercent = 100;
              } else if (idx === currentStoryIndex) {
                fillPercent = Math.min(100, (progressMs / STORY_DURATION_MS) * 100);
              }

              return (
                <div
                  key={story.id}
                  className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-[width] duration-75 ease-linear rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Profile Masthead */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              {/* Profile Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 shadow-2xs overflow-hidden shrink-0">
                <UserAvatar
                  id={activeProfile.id}
                  display_name={activeProfile.name}
                  avatar_url={activeProfile.avatarUrl}
                  size="sm"
                  className="!h-full !w-full"
                  showCreatorBadge={activeProfile.isCreator}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm text-white/95">
                    {activeProfile.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-white/60">
                  <span className="font-mono text-[#D98293]">{activeProfile.username}</span>
                  <span>&middot;</span>
                  <span>{activeStory.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Controls: Play/Pause & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 transition-colors"
                aria-label={isPaused ? 'Resume story' : 'Pause story'}
                title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
              >
                {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors"
                aria-label="Close story viewer"
                title="Close viewer (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Central Stage: Touch/Click Zones & Content ─────────────────── */}
        <div
          className="relative flex-1 my-4 flex flex-col items-center justify-center cursor-pointer"
          onPointerDown={() => setIsHolding(true)}
          onPointerUp={() => setIsHolding(false)}
          onPointerLeave={() => setIsHolding(false)}
        >
          {/* Left Click Zone (Prev Story) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handlePrevStory();
            }}
            title="Previous story"
            className="absolute left-0 top-0 bottom-0 w-[35%] z-10"
          />

          {/* Right Click Zone (Next Story) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNextStory();
            }}
            title="Next story"
            className="absolute right-0 top-0 bottom-0 w-[65%] z-10"
          />

          {/* Story Card Content */}
          <div className="relative z-20 w-full px-2 sm:px-6 py-6 text-center animate-fade-up">
            {/* Tagline Badge */}
            {activeStory.tagline && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-[#F7B6C4] shadow-sm mb-6">
                <Sparkles className="h-3.5 w-3.5 text-[#D98293]" />
                <span>{activeStory.tagline}</span>
              </div>
            )}

            {/* Story Text (Editorial Typography) */}
            <blockquote className="font-serif text-2xl sm:text-[28px] leading-snug sm:leading-relaxed font-medium text-white/95 drop-shadow-md max-w-md mx-auto">
              {activeStory.content}
            </blockquote>

            {/* Interactive Actions / Safe Links */}
            {(activeStory.link || activeStory.secondaryLink) && (
              <div
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-30"
                onClick={(e) => e.stopPropagation()}
              >
                {activeStory.link && (
                  activeStory.link.isExternal ? (
                    <a
                      href={activeStory.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-wine hover:bg-wine-hover border border-white/25 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-wine/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <span>{activeStory.link.label}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Link
                      href={activeStory.link.url}
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-2xl bg-wine hover:bg-wine-hover border border-white/25 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-wine/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <span>{activeStory.link.label}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )
                )}

                {activeStory.secondaryLink && (
                  <Link
                    href={activeStory.secondaryLink.url}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  >
                    <span>{activeStory.secondaryLink.label}</span>
                  </Link>
                )}
              </div>
            )}

            {/* Contextual Discovery Row (Section 5) */}
            {(() => {
              const targetContactId = STATUS_TO_CONTACT_MAP[activeProfile.id];
              if (!targetContactId) return null;

              return (
                <div
                  className="mt-6 flex flex-wrap items-center justify-center gap-2 relative z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onOpenProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProfile(targetContactId);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                    >
                      <Eye className="h-3 w-3 text-[#F3B3C2]" />
                      <span>View Profile</span>
                    </button>
                  )}

                  {onOpenConversation && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenConversation(targetContactId);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                    >
                      <MessageSquare className="h-3 w-3 text-[#F3B3C2]" />
                      <span>Continue in Chat</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Bottom Bar: Story Pagination & Fictional Disclaimer ──────────── */}
        <div className="relative z-30 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px]">Nexus Moments &middot; Fictional Demo Story</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono">
              Story {currentStoryIndex + 1} of {totalStories}
            </span>
          </div>
        </div>

        {/* Desktop Left/Right Profile Switchers */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (currentProfileIndex > 0) {
              setCurrentProfileIndex((prev) => prev - 1);
              setCurrentStoryIndex(0);
              setProgressMs(0);
            }
          }}
          disabled={currentProfileIndex === 0}
          className="hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white disabled:opacity-30 disabled:pointer-events-none transition-transform hover:scale-110 active:scale-95"
          aria-label="Previous profile"
          title="Previous profile"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (currentProfileIndex < profiles.length - 1) {
              setCurrentProfileIndex((prev) => prev + 1);
              setCurrentStoryIndex(0);
              setProgressMs(0);
            }
          }}
          disabled={currentProfileIndex === profiles.length - 1}
          className="hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white disabled:opacity-30 disabled:pointer-events-none transition-transform hover:scale-110 active:scale-95"
          aria-label="Next profile"
          title="Next profile"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

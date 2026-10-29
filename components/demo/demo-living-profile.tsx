'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  ExternalLink,
  MapPin,
  Quote,
  Check,
  Share2,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { type DemoLivingProfile } from './demo-data';
import { getDiscoveryConnections } from './demo-discovery-graph';
import { NexusAvatar3D } from '@/components/user/nexus-avatar-3d';
import { UserAvatar } from '@/components/user/user-avatar';
import { cn } from '@/lib/utils/cn';

interface DemoLivingProfileProps {
  profile: DemoLivingProfile;
  onClose: () => void;
  onStartConversation: (contactId: string) => void;
  onOpenStories?: (statusProfileId: string) => void;
  onSelectGroup?: (groupId: string) => void;
  onNavigateProfile?: (contactId: string) => void;
}

export function DemoLivingProfileView({
  profile,
  onClose,
  onStartConversation,
  onOpenStories,
  onSelectGroup,
  onNavigateProfile,
}: DemoLivingProfileProps) {
  const [copied, setCopied] = useState(false);

  // Keyboard navigation: Escape key closes profile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.name}'s Living Profile`}
      className="fixed inset-0 z-40 flex items-center justify-center sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-fade-in"
    >
      {/* Profile Card Container */}
      <div className="relative w-full h-full sm:max-h-[880px] max-w-2xl bg-white dark:bg-[#1A1217] sm:rounded-3xl border border-stone/80 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden text-charcoal dark:text-foreground">
        {/* ── Fixed Header Nav ────────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 via-black/20 to-transparent">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 transition-all hover:scale-105 active:scale-95"
            aria-label="Return to conversation"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all hover:scale-105 active:scale-95"
              aria-label="Share profile link"
              title="Copy link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all hover:scale-105 active:scale-95"
              aria-label="Close profile"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Profile Body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Cover Artwork Banner */}
          <div className={cn('relative h-44 sm:h-52 w-full overflow-hidden bg-gradient-to-r', profile.coverGradient)}>
            {profile.coverImage && (
              <Image
                src={profile.coverImage}
                alt={`${profile.name} cover atmosphere`}
                fill
                priority
                className="object-cover object-center filter contrast-[1.08] brightness-[0.75] opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1217] via-transparent to-black/40" />

            {/* Profile Category Badge in Cover */}
            <div className="absolute bottom-4 right-4 z-10">
              <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/90 border border-white/15">
                Living Profile &middot; Isolated Demo
              </span>
            </div>
          </div>

          {/* Profile Identity Bar */}
          <div className="px-5 sm:px-8 pb-8 -mt-14 sm:-mt-16 relative z-10 space-y-6">
            {/* Avatar & Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              {/* Avatar with Story Ring if stories exist */}
              <div className="relative">
                <div
                  className={cn(
                    'relative rounded-full p-[2px]',
                    profile.statusProfileId
                      ? 'bg-gradient-to-tr from-[#7A223B] via-[#943851] to-[#D48B9B] dark:from-[#B84564] dark:via-[#D16B85] dark:to-[#E8B8C4] cursor-pointer hover:scale-105 transition-transform'
                      : 'bg-black/[0.08] dark:bg-white/[0.12]'
                  )}
                  onClick={() => {
                    if (profile.statusProfileId && onOpenStories) {
                      onOpenStories(profile.statusProfileId);
                    }
                  }}
                  title={profile.statusProfileId ? 'Click to view stories' : undefined}
                >
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full p-[2px] bg-white dark:bg-[#1A1418] overflow-hidden shadow-2xs">
                    <UserAvatar
                      id={profile.id}
                      display_name={profile.name}
                      avatar_url={profile.avatarUrl}
                      size="2xl"
                      className="!h-full !w-full"
                      showCreatorBadge={profile.isCreator}
                    />
                  </div>

                  <span
                    className={cn(
                      'absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white dark:border-[#1A1418]',
                      profile.status === 'online'
                        ? 'bg-emerald-500'
                        : profile.status === 'away'
                        ? 'bg-amber-500'
                        : 'bg-stone-strong'
                    )}
                  />
                </div>

                {profile.statusProfileId && (
                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-wine text-white text-[9.5px] font-medium px-2 py-0.5 shadow-2xs whitespace-nowrap">
                    View Stories
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => onStartConversation(profile.contactId)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-wine hover:bg-wine-hover text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-wine/25 border-t border-white/20 transition-all hover:scale-105 active:scale-95"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Message {profile.name}</span>
                </button>

                {profile.statusProfileId && onOpenStories && (
                  <button
                    type="button"
                    onClick={() => onOpenStories(profile.statusProfileId!)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 dark:bg-white/10 hover:bg-white/20 border border-stone-subtle dark:border-white/15 px-4 py-2.5 text-xs font-semibold text-charcoal dark:text-white transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" />
                    <span>Explore Stories</span>
                  </button>
                )}

                {profile.instagramUrl && (
                  <a
                    href={profile.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-stone-subtle dark:border-white/15 px-3.5 py-2.5 text-xs font-semibold text-wine dark:text-[#F3B3C2] transition-all hover:scale-105 active:scale-95"
                    title="Open Instagram"
                  >
                    <span>Instagram</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Profile Masthead Names & Role */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                  {profile.name}
                </h1>

                {profile.badge && (
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border',
                      profile.isCreator
                        ? 'bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] border-wine/25'
                        : 'bg-stone/40 dark:bg-white/10 text-muted dark:text-stone border-stone-subtle dark:border-white/15'
                    )}
                  >
                    {profile.badge}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-[13px] text-muted">
                <span className="font-mono text-wine dark:text-[#E2A6B3] font-semibold">
                  {profile.username}
                </span>
                <span>&middot;</span>
                <span>{profile.role}</span>
                {profile.location && (
                  <>
                    <span>&middot;</span>
                    <span className="inline-flex items-center gap-1 text-[12px]">
                      <MapPin className="h-3 w-3 text-wine dark:text-[#E2A6B3]" />
                      <span>{profile.location}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Distinctive Biography */}
            <div className="rounded-2xl border border-stone/80 dark:border-[#382833] bg-porcelain/60 dark:bg-[#20171D] p-4 sm:p-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 font-mono">
                Biography
              </h2>
              <p className="text-[13.5px] sm:text-[14px] leading-relaxed text-charcoal/90 dark:text-stone/90">
                {profile.bio}
              </p>
            </div>

            {/* Current Mood & Favorite Thought */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Mood */}
              <div className="rounded-2xl border border-stone/80 dark:border-[#382833] bg-white dark:bg-[#1E161C] p-4 shadow-xs">
                <div className="flex items-center gap-2 text-wine dark:text-[#E2A6B3] mb-2">
                  <Compass className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                    Current Focus &amp; Mood
                  </span>
                </div>
                <p className="text-[13px] font-medium leading-relaxed italic text-charcoal dark:text-stone">
                  {profile.currentMood}
                </p>
              </div>

              {/* Thought / Quote */}
              <div className="rounded-2xl border border-stone/80 dark:border-[#382833] bg-white dark:bg-[#1E161C] p-4 shadow-xs">
                <div className="flex items-center gap-2 text-wine dark:text-[#E2A6B3] mb-2">
                  <Quote className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                    Personal Thought
                  </span>
                </div>
                <blockquote className="text-[13px] font-serif leading-relaxed text-charcoal dark:text-stone">
                  {profile.favoriteQuote}
                </blockquote>
                {profile.quoteAttribution && (
                  <p className="text-[11px] text-muted mt-2 text-right font-sans">
                    &mdash; {profile.quoteAttribution}
                  </p>
                )}
              </div>
            </div>

            {/* Areas of Expertise / Interests */}
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5 font-mono">
                Areas of Inquiry &amp; Craft
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, i) => (
                  <span
                    key={i}
                    className="rounded-xl border border-stone-subtle dark:border-white/10 bg-porcelain dark:bg-[#231A20] px-3 py-1 text-[12px] font-medium text-charcoal dark:text-stone"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Selected Highlights / Craft Archive */}
            {profile.highlights.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5 font-mono">
                  Craft Archive &amp; Highlights
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.highlights.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-2xl border border-stone/80 dark:border-[#382833] bg-white dark:bg-[#1F171D] p-4 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[10.5px] text-muted font-mono mb-1">
                          <span className="font-semibold text-wine dark:text-[#E2A6B3]">{h.category}</span>
                          <span>{h.date}</span>
                        </div>
                        <h3 className="text-[13.5px] font-bold text-charcoal dark:text-white leading-snug">
                          {h.title}
                        </h3>
                        <p className="text-[12px] text-muted mt-1 leading-relaxed">
                          {h.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {profile.links.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5 font-mono">
                  External Destinations &amp; Notes
                </h2>
                <div className="space-y-2">
                  {profile.links.map((link, i) => (
                    link.isExternal ? (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-2xl border border-stone/80 dark:border-[#382833] bg-white dark:bg-[#1F171D] p-3.5 hover:border-wine/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-[13px] text-charcoal dark:text-white group-hover:text-wine dark:group-hover:text-[#F7B6C4] transition-colors">
                            <span>{link.label}</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                          {link.description && (
                            <p className="text-[11.5px] text-muted mt-0.5">{link.description}</p>
                          )}
                        </div>
                      </a>
                    ) : (
                      <Link
                        key={i}
                        href={link.url}
                        onClick={onClose}
                        className="group flex items-center justify-between rounded-2xl border border-stone/80 dark:border-[#382833] bg-white dark:bg-[#1F171D] p-3.5 hover:border-wine/40 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-[13px] text-charcoal dark:text-white group-hover:text-wine dark:group-hover:text-[#F7B6C4] transition-colors">
                            {link.label}
                          </div>
                          {link.description && (
                            <p className="text-[11.5px] text-muted mt-0.5">{link.description}</p>
                          )}
                        </div>
                      </Link>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Discovery Connections (Section 5) */}
            {(() => {
              const relatedConnections = getDiscoveryConnections(profile.contactId);
              if (!relatedConnections || relatedConnections.length === 0) return null;

              return (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted font-mono flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-wine" />
                      <span>Connected in Nexus Discovery</span>
                    </h2>
                    <span className="text-[10.5px] font-mono text-muted/70">
                      Related Threads
                    </span>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {relatedConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="rounded-2xl border border-stone/80 dark:border-[#382833] bg-porcelain/60 dark:bg-[#1F171D] p-3.5 flex flex-col justify-between hover:border-wine/30 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 text-[10px] mb-1 font-mono">
                            <span className="font-semibold text-wine dark:text-[#E2A6B3]">
                              {conn.categoryLabel}
                            </span>
                            {conn.badge && (
                              <span className="rounded-full bg-stone-subtle dark:bg-white/10 px-1.5 py-0.2 text-charcoal dark:text-stone">
                                {conn.badge}
                              </span>
                            )}
                          </div>
                          <h3 className="text-[12.5px] font-bold text-charcoal dark:text-white leading-tight">
                            {conn.title}
                          </h3>
                          <p className="text-[11px] text-muted mt-1 leading-snug line-clamp-2">
                            {conn.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-stone-subtle dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              if (conn.targetType === 'contact') {
                                onStartConversation(conn.targetId);
                              } else if (conn.targetType === 'profile' && onNavigateProfile) {
                                onNavigateProfile(conn.targetId);
                              } else if (conn.targetType === 'story' && onOpenStories) {
                                onOpenStories(conn.targetId);
                              } else if (conn.targetType === 'group' && onSelectGroup) {
                                onClose();
                                onSelectGroup(conn.targetId);
                              } else if (conn.targetType === 'external' && conn.externalUrl) {
                                window.open(conn.externalUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-wine dark:text-[#E2A6B3] hover:underline"
                          >
                            <span>{conn.actionLabel}</span>
                            {conn.targetType === 'external' ? (
                              <ExternalLink className="h-2.5 w-2.5" />
                            ) : (
                              <ArrowRight className="h-2.5 w-2.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Creator Signature Credit */}
            <div className="pt-6 border-t border-stone-subtle dark:border-[#33252E] flex flex-col items-center justify-center text-center gap-1">
              <span className="font-serif text-[11px] tracking-[0.2em] font-bold text-charcoal/70 dark:text-stone/60 uppercase">
                POWERED BY AASIF
              </span>
              <p className="text-[10.5px] text-muted-faint font-sans">
                Nexus.talks &middot; The Living Profiles Experience &middot; 100% Isolated Demo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

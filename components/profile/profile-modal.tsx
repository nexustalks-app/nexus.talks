'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Profile } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileView, type ProfileViewData } from './profile-view';
import { useProfile } from './use-profile';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  username?: string;
  fallback?: Pick<
    Profile,
    'display_name' | 'username' | 'avatar_url' | 'status'
  >;
  liveStatus?: Profile['status'];
}

const EXIT_MS = 160;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function ProfileModal({
  open,
  onClose,
  userId,
  username,
  fallback,
  liveStatus,
}: ProfileModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setClosing(false);
      return;
    }
    if (!shouldRender) return;

    setClosing(true);
    const timer = window.setTimeout(
      () => {
        setShouldRender(false);
        setClosing(false);
      },
      prefersReducedMotion() ? 0 : EXIT_MS
    );
    return () => window.clearTimeout(timer);
  }, [open, shouldRender]);

  const { profile: fetched, loading, error } = useProfile({
    userId,
    username: username ?? fallback?.username,
    enabled: open,
  });

  useEffect(() => {
    if (!shouldRender) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!shouldRender || typeof document === 'undefined') return null;

  const data: ProfileViewData | null = fetched
    ? { ...fetched, status: liveStatus ?? fetched.status }
    : fallback
    ? { ...fallback, status: liveStatus ?? fallback.status }
    : null;

  return createPortal(
    <div
      className={`${
        closing ? 'nx-backdrop-out' : 'nx-backdrop-in'
      } fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 backdrop-blur-sm sm:items-center sm:p-6`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes nx-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nx-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes nx-panel-in {
          from { opacity: 0; transform: translate3d(0, var(--nx-modal-y), 0) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes nx-panel-out {
          from { opacity: 1; transform: none; }
          to   { opacity: 0; transform: translate3d(0, var(--nx-modal-y), 0) scale(0.98); }
        }
        .nx-modal-panel { --nx-modal-y: 24px; }
        @media (min-width: 640px) { .nx-modal-panel { --nx-modal-y: 8px; } }
        .nx-backdrop-in  { animation: nx-backdrop-in ${EXIT_MS}ms ease-out both; }
        .nx-backdrop-out { animation: nx-backdrop-out ${EXIT_MS}ms ease-in both; }
        .nx-panel-in  { animation: nx-panel-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .nx-panel-out { animation: nx-panel-out ${EXIT_MS}ms ease-in both; }
        @media (prefers-reduced-motion: reduce) {
          .nx-backdrop-in, .nx-backdrop-out, .nx-panel-in, .nx-panel-out {
            animation: none !important;
          }
        }
        .nx-reduce-motion .nx-backdrop-in,
        .nx-reduce-motion .nx-backdrop-out,
        .nx-reduce-motion .nx-panel-in,
        .nx-reduce-motion .nx-panel-out,
        .nx-disable-anim .nx-backdrop-in,
        .nx-disable-anim .nx-backdrop-out,
        .nx-disable-anim .nx-panel-in,
        .nx-disable-anim .nx-panel-out {
          animation: none !important;
        }
      `}</style>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`nx-modal-panel ${
          closing ? 'nx-panel-out' : 'nx-panel-in'
        } relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone/80 dark:border-[#3B2C34] liquid-glass-card shadow-2xl`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-stone dark:border-[#3B2C34] bg-porcelain dark:bg-[#2C2128] text-muted hover:text-charcoal dark:hover:text-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-stone/50 dark:hover:bg-[#382B34] active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-h-[88dvh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {data ? (
            <ProfileView
              profile={data}
              variant="modal"
              titleId={titleId}
              detailsLoading={loading && !fetched}
            />
          ) : loading ? (
            <div
              className="flex flex-col items-center px-4 pb-8 pt-12"
              aria-busy="true"
            >
              <span id={titleId} className="sr-only">
                Loading profile
              </span>
              <Skeleton className="h-28 w-28 rounded-full" />
              <Skeleton className="mt-4 h-7 w-44 rounded-lg" />
              <Skeleton className="mt-2 h-4 w-28 rounded" />
              <Skeleton className="mt-7 h-24 w-full rounded-xl" />
            </div>
          ) : (
            <div className="px-6 pb-10 pt-14 text-center">
              <h2
                id={titleId}
                className="text-lg font-semibold text-charcoal"
              >
                Couldn&apos;t load profile
              </h2>
              <p className="mt-1 text-sm text-muted">
                {error ?? 'Please try again in a moment.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

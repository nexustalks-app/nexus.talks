'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Lock, Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#150F13] text-foreground flex flex-col lg:flex-row overflow-x-hidden selection:bg-wine/25 selection:text-[#F7B6C4]">
      {/* ── Desktop Left Hero Pane: Cinematic Eye Artwork (lg+) ──────────── */}
      <section
        aria-label="Nexus.talks Visual Atmosphere"
        className="relative hidden lg:flex lg:w-[50%] xl:w-[52%] 2xl:w-[55%] flex-col justify-between overflow-hidden bg-[#150F13] select-none"
      >
        {/* Background Artwork Layer */}
        {!imageError ? (
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/images/auth-eye.jpg"
              alt="Cinematic eye artwork representing perception and focused conversation"
              fill
              priority
              quality={90}
              className="object-cover object-center scale-[1.05] filter contrast-[1.08] brightness-[0.92] transition-opacity duration-700 animate-ambient-float motion-reduce:animate-none"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          /* Graceful Fallback if image cannot load */
          <div className="absolute inset-0 bg-gradient-to-br from-[#1C1419] via-[#2A1B22] to-[#120D10]">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_40%_35%,rgba(167,121,130,0.35),transparent_60%)]" />
          </div>
        )}

        {/* Chiaroscuro Cinematic Gradient Vignette Overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-[#150F13] opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#150F13] via-transparent to-black/50" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(84,44,56,0.3),transparent_70%)]" />

        {/* Top Masthead */}
        <div className="relative z-10 p-8 lg:p-12 animate-fade-down">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 transition-transform active:scale-95"
            title="Return to Nexus.talks home"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-wine text-white font-serif font-bold text-lg shadow-lg shadow-wine/30 border-t border-white/25 transition-transform duration-200 group-hover:scale-105">
              N
            </span>
            <span className="font-serif text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              Nexus<span className="text-[#D98293]">.</span>talks
            </span>
          </Link>
        </div>

        {/* Bottom Editorial Quote */}
        <div className="relative z-10 p-8 lg:p-12 max-w-xl animate-fade-up delay-200">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-3.5 py-1 text-[11.5px] font-medium text-[#E4D5DC] shadow-sm mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[#D98293]" />
            <span>Atmospheric Messaging &middot; Private Encryption</span>
          </div>

          <blockquote className="font-serif text-2xl sm:text-3xl leading-snug font-medium text-white/95 drop-shadow-md">
            &ldquo;In an era of relentless noise, intimacy and private conversation are the ultimate luxury.&rdquo;
          </blockquote>

          <p className="mt-4 text-[13px] tracking-wide text-white/60 font-sans">
            Direct, synchronized communication designed with editorial clarity.
          </p>

          <div className="mt-6 flex items-center gap-5 text-[12px] text-white/50">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Row-Level Security
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-[#D98293]" /> Isolated Channels
            </span>
          </div>
        </div>
      </section>

      {/* ── Mobile Top Artwork Banner (< lg) ─────────────────────────────── */}
      <div className="relative lg:hidden h-36 sm:h-44 w-full overflow-hidden bg-[#150F13] shrink-0">
        {!imageError ? (
          <Image
            src="/images/auth-eye.jpg"
            alt="Cinematic eye artwork"
            fill
            priority
            quality={85}
            className="object-cover object-[center_35%] filter contrast-[1.08] brightness-[0.85]"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A1B22] to-[#150F13]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#150F13] via-[#150F13]/40 to-black/50" />
        
        {/* Mobile Header Wordmark */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between animate-fade-down">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine text-white font-serif font-bold text-xs shadow-md border-t border-white/20">
              N
            </span>
            <span className="font-serif text-lg font-bold tracking-tight text-white">
              Nexus<span className="text-[#D98293]">.</span>talks
            </span>
          </Link>

          <Link
            href="/demo"
            className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-md"
          >
            See Demo
          </Link>
        </div>
      </div>

      {/* ── Authentication Center Pane ───────────────────────────────────── */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 -mt-8 sm:-mt-10 lg:mt-0 z-10 bg-gradient-to-b from-transparent via-[#150F13] to-[#150F13] lg:bg-none">
        {/* Ambient Subtle Wine Glow for Glass Card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-[360px] w-[360px] rounded-full bg-wine/20 blur-[90px] dark:bg-wine/30 -z-10"
        />

        {/* ── Signature Glass Authentication Card ─────────────────────────── */}
        <div
          className="w-full max-w-[440px] rounded-3xl p-6 sm:p-9 md:p-10
            glass-surface bg-white/92 dark:bg-[#1E161C]/92 backdrop-blur-2xl
            border border-stone/80 dark:border-white/10
            shadow-2xl shadow-black/25 dark:shadow-black/70
            animate-fade-scale"
        >
          {/* Card Brand Header (Desktop) */}
          <div className="hidden lg:flex items-center justify-between pb-6 mb-6 border-b border-stone-subtle dark:border-white/10">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group"
              title="Return to home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine text-white font-serif font-bold text-xs shadow-sm border-t border-white/20 transition-transform group-hover:scale-105">
                N
              </span>
              <span className="font-serif text-lg font-bold tracking-tight text-charcoal dark:text-white">
                Nexus<span className="text-wine">.</span>talks
              </span>
            </Link>

            <Link
              href="/demo"
              className="rounded-full bg-wine/10 dark:bg-wine/25 hover:bg-wine/20 px-3 py-0.5 text-[11px] font-semibold text-wine dark:text-[#F3B3C2] transition-colors"
            >
              See Demo →
            </Link>
          </div>

          {/* Render Route Form */}
          {children}
        </div>

        {/* Footer Links & Copyright */}
        <footer className="mt-8 text-center text-[12px] text-muted dark:text-stone/60">
          <p>&copy; {new Date().getFullYear()} Nexus.talks &middot; End-to-End Isolations</p>
        </footer>
      </main>
    </div>
  );
}

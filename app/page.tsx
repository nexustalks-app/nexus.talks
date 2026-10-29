import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  MessageSquare,
  Play,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Nexus.talks — Private, Intimate Communication',
  description: 'Where conversation has weight again. A private communication sanctuary engineered for deliberate dialogue and zero algorithmic noise.',
};

export default async function HomePage() {
  // Check if returning visitor is already authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-[100dvh] bg-porcelain text-charcoal flex flex-col justify-between selection:bg-wine/15 selection:text-wine overflow-x-hidden">
      {/* ── Top Atmospheric Navigation ──────────────────────────────────── */}
      <header className="glass-header sticky top-0 z-30 border-b border-stone/80 bg-white/80 dark:bg-[#1C1619]/80 backdrop-blur-md px-5 py-4 sm:px-10 animate-fade-down">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          {/* Brand Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-95 shrink-0 whitespace-nowrap"
            title="Nexus.talks"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine font-serif font-bold text-white shadow-sm border-t border-white/20 transition-transform duration-150 group-hover:scale-105">
              N
            </span>
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-charcoal dark:text-foreground">
              Nexus<span className="text-wine dark:text-[#E2A6B3]">.</span>talks
            </span>
          </Link>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/demo"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-stone/90 dark:border-[#3B2C34] bg-white/70 dark:bg-[#251D22]/70 px-3 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground hover:border-wine/40 hover:text-wine transition-all active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" />
              <span>See a demo</span>
            </Link>

            {user ? (
              <Link
                href="/conversations"
                className="inline-flex items-center gap-1.5 rounded-full bg-wine px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-wine-hover active:scale-95 border-t border-white/20 whitespace-nowrap shrink-0"
              >
                <span>Open Messenger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold text-muted hover:text-charcoal transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="inline-flex sm:hidden items-center gap-1.5 rounded-full bg-wine px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-wine-hover active:scale-95 border-t border-white/20 whitespace-nowrap shrink-0"
                >
                  <span>Open App</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/signup"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-wine px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-wine-hover active:scale-95 border-t border-white/20"
                >
                  <span>Get started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Welcome Stage ───────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-10 sm:px-10 sm:py-20 flex flex-col justify-center">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Expressive Typography & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Context Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-subtle dark:border-[#382833] bg-white/90 dark:bg-[#20181D] px-3.5 py-1 text-[11.5px] font-medium text-muted dark:text-stone/80 shadow-xs mb-6 animate-fade-up">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Private Sanctuary · Deliberate Communication</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-charcoal dark:text-foreground leading-[1.12] animate-fade-up delay-100">
              Where conversation has{' '}
              <span className="text-wine dark:text-[#F3B3C2] italic font-serif font-normal">
                weight again
              </span>
              .
            </h1>

            {/* Supporting Copy */}
            <p className="mt-5 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-muted dark:text-muted-foreground animate-fade-up delay-200">
              A private communication sanctuary engineered for deliberate dialogue, tactile elegance, and zero algorithmic noise. Experience messaging crafted for people who value words.
            </p>

            {/* ── Primary Action Area with 40% Demo Ratio ─────────────────── */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto animate-fade-up delay-300">
              {user ? (
                <Link
                  href="/conversations"
                  className="inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-2xl bg-wine px-8 text-[14.5px] font-semibold text-white shadow-md shadow-wine/25 transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-wine-hover hover:scale-[1.02] active:scale-[0.98] border-t border-white/20"
                >
                  <span>Continue to Messages</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-2xl bg-wine px-8 text-[14.5px] font-semibold text-white shadow-md shadow-wine/25 transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-wine-hover hover:scale-[1.02] active:scale-[0.98] border-t border-white/20"
                >
                  <span>Get started</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {/* Secondary Action: See a demo (~40% visual prominence) */}
              <Link
                href="/demo"
                className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-2xl border border-stone-strong/70 dark:border-[#4B3944] bg-white/80 dark:bg-[#251D22]/80 px-5 text-[13.5px] font-medium text-charcoal dark:text-foreground shadow-2xs transition-[background-color,border-color,color,transform] duration-150 ease-out hover:bg-stone/30 hover:border-wine/50 hover:text-wine hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3] fill-wine dark:fill-[#E2A6B3]" />
                <span>See a demo</span>
              </Link>
            </div>

            {/* Existing user note */}
            {!user && (
              <p className="mt-4 text-[12.5px] text-muted dark:text-muted-foreground animate-fade-up delay-400">
                Already registered?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-wine dark:text-[#F7B6C4] hover:underline"
                >
                  Sign in to your account →
                </Link>
              </p>
            )}

            {/* Core Trust Indicators */}
            <div className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6 text-[12px] text-muted animate-fade-up delay-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> PostgreSQL Row-Level Security
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-wine dark:text-[#E2A6B3]" /> Private Username Discovery
              </span>
            </div>
          </div>

          {/* Right Column: Layered Cinematic Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto w-full max-w-md animate-fade-scale delay-200">
              {/* Subtle Wine Glow Ambient */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 rounded-3xl bg-wine/10 blur-2xl dark:bg-wine/20 -z-10"
              />

              {/* Layer 1: Chiaroscuro Atmospheric Artwork Card */}
              <div className="overflow-hidden rounded-3xl border border-stone/80 dark:border-[#3B2C34] glass-surface bg-white/90 dark:bg-[#1E161C]/90 shadow-xl">
                <div className="relative h-48 w-full overflow-hidden bg-[#150F13]">
                  <Image
                    src="/images/auth-eye-atmosphere.jpg"
                    alt="Nexus.talks visual atmosphere"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="object-cover object-center filter contrast-[1.08] brightness-[0.88] animate-ambient-float"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E161C] via-[#1E161C]/40 to-transparent" />
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="rounded-full bg-black/50 backdrop-blur-md px-3 py-0.5 text-[10.5px] font-semibold text-white/90 border border-white/15">
                      Intimate Salon
                    </span>
                  </div>
                </div>

                {/* Layer 2: Live Conversation Vignette */}
                <div className="p-5 space-y-3 animate-fade-up delay-300">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-subtle dark:border-[#33252E]">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine text-white font-bold text-xs">
                          ER
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white dark:border-[#1E161C] bg-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-charcoal dark:text-foreground">Elena Rostova</p>
                        <p className="text-[10.5px] text-muted">Architecture curator</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted font-mono">10:48 AM</span>
                  </div>

                  {/* Message Bubbles Vignette */}
                  <div className="space-y-2 pt-1 text-[12.5px]">
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-sm border border-stone/80 dark:border-[#382833] bg-porcelain dark:bg-[#251D22] p-3 max-w-[88%] text-charcoal dark:text-stone shadow-2xs">
                        The natural daylight in the pavilion at 4 PM creates an incredible quiet rhythm.
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="rounded-2xl rounded-br-sm bg-wine p-3 max-w-[88%] text-white shadow-xs">
                        It lets every word resonate without distraction.
                      </div>
                    </div>
                  </div>

                  {/* Micro Demo Trigger */}
                  <div className="pt-2">
                    <Link
                      href="/demo"
                      className="group flex items-center justify-between rounded-xl bg-porcelain/80 dark:bg-[#271E24] border border-stone-subtle dark:border-[#33252E] px-3.5 py-2 text-[11.5px] text-muted hover:text-wine dark:hover:text-[#F7B6C4] transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" />
                        <span>Experience full interactive demo</span>
                      </span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Three Pillars of Intimacy ────────────────────────────────────── */}
        <section aria-label="Core Philosophy" className="mt-20 border-t border-stone-subtle dark:border-[#30242B] pt-14">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone/80 dark:border-[#3B2C34] glass-surface bg-white/70 dark:bg-[#20181D]/70 p-6 shadow-xs animate-fade-up delay-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#E2A6B3]">
                <MessageSquare className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-base font-bold text-charcoal dark:text-foreground">
                Visual &amp; Acoustic Stillness
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted dark:text-muted-foreground">
                No algorithmic feeds, no vanity engagement metrics, and zero marketing spam. Just clean, unhurried conversation between verified people.
              </p>
            </div>

            <div className="rounded-2xl border border-stone/80 dark:border-[#3B2C34] glass-surface bg-white/70 dark:bg-[#20181D]/70 p-6 shadow-xs animate-fade-up delay-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#E2A6B3]">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-base font-bold text-charcoal dark:text-foreground">
                Architectural Isolation
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted dark:text-muted-foreground">
                Protected by strict PostgreSQL Row-Level Security. Accounts are private by default and discoverable only through intentional handle searches.
              </p>
            </div>

            <div className="rounded-2xl border border-stone/80 dark:border-[#3B2C34] glass-surface bg-white/70 dark:bg-[#20181D]/70 p-6 shadow-xs animate-fade-up delay-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#E2A6B3]">
                <Sparkles className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-base font-bold text-charcoal dark:text-foreground">
                Tactile Craftsmanship
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted dark:text-muted-foreground">
                Crafted in Deep Wine &amp; Porcelain surfaces. Fluid responsive layouts, buttery transitions, and typography designed for reading long-form thoughts.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Creator Brand Signature & Footer ─────────────────────────────── */}
      <footer className="border-t border-stone/80 dark:border-[#33252E] bg-white/80 dark:bg-[#181215]/80 backdrop-blur-md px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-6xl flex flex-col items-center justify-center text-center">
          {/* Brand Signature: Exactly "POWERED BY AASIF" */}
          <div className="mb-6 flex flex-col items-center gap-1.5 animate-fade-up delay-400">
            <span className="font-serif text-[12.5px] tracking-[0.25em] font-bold text-charcoal/80 dark:text-stone/70">
              POWERED BY AASIF
            </span>
            <div className="flex items-center gap-2 text-[11.5px] text-muted">
              <span>Creator of Nexus.talks</span>
              <span>&middot;</span>
              <a
                href="https://www.instagram.com/the_aasif9/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-wine dark:text-[#F7B6C4] hover:underline inline-flex items-center gap-0.5"
              >
                @the_aasif9
              </a>
            </div>
            <span className="text-[11px] text-muted-faint tracking-wide font-sans mt-0.5">
              Dedicated to deliberate, enduring dialogue
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[12.5px] text-muted">
            <Link href="/demo" className="hover:text-wine dark:hover:text-[#F7B6C4] transition-colors">
              Interactive Demo
            </Link>
            <Link href="/login" className="hover:text-wine dark:hover:text-[#F7B6C4] transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-wine dark:hover:text-[#F7B6C4] transition-colors">
              Create Account
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-muted-faint">
            &copy; {new Date().getFullYear()} Nexus.talks &middot; All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

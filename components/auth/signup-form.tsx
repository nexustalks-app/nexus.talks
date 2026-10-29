'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email confirmation state
  const [confirmationEmailSent, setConfirmationEmailSent] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (displayName.trim().length < 1) {
      setError('Display name is required');
      setLoading(false);
      return;
    }

    const cleanUsername = username.replace(/^@+/, '').trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setError('Username must be between 3 and 30 characters');
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      setError('Username can only contain lowercase letters, numbers, underscores, dots, and hyphens');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const supabase = createClient();
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            username: cleanUsername,
          },
          emailRedirectTo,
        },
      });

      if (signUpError) {
        const isNetworkOrDnsError =
          signUpError.message === 'Failed to fetch' ||
          signUpError.message.toLowerCase().includes('fetch') ||
          (signUpError as { status?: number }).status === 0;

        const isRateLimit =
          signUpError.message.toLowerCase().includes('rate limit') ||
          (signUpError as { status?: number }).status === 429;

        if (isNetworkOrDnsError) {
          setError(
            'Unable to connect to the authentication server. Please check your internet connection or verify in the Supabase dashboard that your project is active and not paused.'
          );
        } else if (isRateLimit) {
          setError(
            'The email verification service is temporarily rate-limited. Please wait a few minutes before trying again or explore our live demo.'
          );
        } else if (
          signUpError.message.toLowerCase().includes('unique') ||
          signUpError.message.toLowerCase().includes('duplicate') ||
          signUpError.message.toLowerCase().includes('username')
        ) {
          setError('This username is already taken. Please choose another username.');
        } else if (
          signUpError.message.toLowerCase().includes('already registered') ||
          signUpError.message.toLowerCase().includes('already exists')
        ) {
          setError('An account with this email address already exists. Please sign in instead.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Check if user enumeration protection returned an existing user with empty identities
      if (data?.user?.identities && data.user.identities.length === 0) {
        setError('An account with this email address already exists. Please sign in or use a different email.');
        setLoading(false);
        return;
      }

      // ── Path A: Immediate Authentication (Session established) ────────────
      if (data?.session) {
        if (data.user) {
          await supabase
            .from('profiles')
            .update({
              status: 'online',
              last_seen_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);
        }
        router.push('/conversations');
        router.refresh();
        return;
      }

      // ── Path B: Email Verification Required (No active session yet) ──────
      if (data?.user && !data.session) {
        setConfirmationEmailSent(trimmedEmail);
        setResendCooldown(60);
        setLoading(false);
        return;
      }

      // Fallback
      router.push('/conversations');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmailSent || resendCooldown > 0 || resending) return;

    setResending(true);
    setResendError(null);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: confirmationEmailSent,
        options: {
          emailRedirectTo,
        },
      });

      if (resendErr) {
        if (resendErr.message.toLowerCase().includes('rate limit') || (resendErr as { status?: number }).status === 429) {
          setResendError('Email rate limit reached. Please wait a few minutes before requesting another link.');
        } else {
          setResendError(resendErr.message);
        }
        setResending(false);
        return;
      }

      setResendMessage(`Verification email resent to ${confirmationEmailSent}. Please check your inbox.`);
      setResendCooldown(60);
    } catch {
      setResendError('Failed to resend confirmation email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  // ── Render Dedicated Email Verification Confirmation Screen ──────────────
  if (confirmationEmailSent) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Visual Header Banner */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 rounded-2xl border border-wine/25 bg-wine/5 dark:bg-wine/15 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-wine to-burgundy text-white shadow-md shadow-wine/30 border-t border-white/25">
            <Mail className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] px-2.5 py-0.5 text-[11px] font-bold mb-1 border border-wine/15">
              <ShieldCheck className="h-3 w-3" />
              <span>Account Created · Verification Pending</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-charcoal dark:text-white leading-tight">
              Check your email
            </h2>
            <p className="mt-1 text-[13px] text-muted dark:text-stone/80 leading-relaxed">
              We&apos;ve sent an activation link to:
            </p>
            <p className="mt-1.5 text-xs font-mono font-semibold text-wine dark:text-[#F7B6C4] bg-white/90 dark:bg-black/40 border border-wine/25 rounded-lg px-3 py-1.5 inline-block break-all shadow-2xs">
              {confirmationEmailSent}
            </p>
          </div>
        </div>

        {/* Clear Step-by-Step Instructions */}
        <div className="space-y-2.5 rounded-2xl border border-stone-subtle dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 text-xs text-charcoal/90 dark:text-stone/90">
          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wine text-white font-bold text-[10.5px]">
              1
            </span>
            <p className="leading-relaxed">
              Open your email client and locate the message from <strong>Nexus.talks</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wine text-white font-bold text-[10.5px]">
              2
            </span>
            <p className="leading-relaxed">
              Click <strong>Confirm your email</strong>. You will be authenticated and smoothly directed into your conversations.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wine text-white font-bold text-[10.5px]">
              3
            </span>
            <p className="leading-relaxed">
              Be sure to inspect your spam or junk folder if the email does not arrive within a few minutes.
            </p>
          </div>
        </div>

        {/* Resend Status / Feedback Alerts */}
        {resendMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="flex-1">{resendMessage}</span>
          </div>
        )}

        {resendError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2.5 text-xs text-wine dark:text-[#F7B6C4] animate-in fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1">{resendError}</span>
          </div>
        )}

        {/* Resend & Secondary Action Controls */}
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={handleResendConfirmation}
            disabled={resendCooldown > 0 || resending}
            className="w-full h-11 text-xs font-semibold border-stone/80 dark:border-white/15 hover:border-wine/40 hover:bg-porcelain/60 dark:hover:bg-white/10"
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Resending verification link…</span>
              </span>
            ) : resendCooldown > 0 ? (
              <span className="tabular-nums">Resend available in {resendCooldown}s</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5 text-wine dark:text-[#F3B3C2]">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Resend verification email</span>
              </span>
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setConfirmationEmailSent(null);
              setError('');
              setResendMessage(null);
              setResendError(null);
            }}
            className="w-full py-2 text-center text-xs text-muted hover:text-charcoal dark:hover:text-white transition-colors"
          >
            Entered the wrong email or want to change details?
          </button>
        </div>

        {/* Clear Pathway to Login */}
        <div className="border-t border-stone-subtle dark:border-white/10 pt-4 flex items-center justify-between text-xs text-muted">
          <span>Already confirmed?</span>
          <Link
            href="/login?verified=true"
            className="font-semibold text-wine dark:text-[#F7B6C4] hover:underline flex items-center gap-1"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Render Registration Input Form ─────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose/30 bg-rose/10 dark:bg-rose/20 px-4 py-3 text-[13px] text-wine dark:text-[#F7B6C4] backdrop-blur-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-wine dark:text-[#F7B6C4] mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
            {error.includes('already exists') && (
              <div className="mt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 rounded-lg bg-wine text-white px-3 py-1 text-xs font-semibold hover:bg-wine-hover transition-colors"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Display Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="displayName"
          className="block text-[13px] font-medium tracking-wide text-charcoal dark:text-stone"
        >
          Display name
        </label>
        <Input
          id="displayName"
          type="text"
          placeholder="Jane Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          disabled={loading}
          autoComplete="name"
          maxLength={50}
          className="h-11 bg-white/80 dark:bg-[#251D22]/80 border-stone/80 dark:border-white/15 focus-visible:border-wine focus-visible:ring-wine/20 text-charcoal dark:text-white placeholder:text-muted-faint"
        />
      </div>

      {/* Unique Username */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="username"
            className="block text-[13px] font-medium tracking-wide text-charcoal dark:text-stone"
          >
            Username
          </label>
          <span className="text-[11.5px] text-muted dark:text-stone/70">Unique @handle (3-30 chars)</span>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[13.5px] text-wine dark:text-[#E2A6B3]">
            @
          </span>
          <Input
            id="username"
            type="text"
            placeholder="janedoe"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
                  .replace(/^@+/, '')
                  .toLowerCase()
                  .replace(/[^a-z0-9_.-]/g, '')
              )
            }
            required
            disabled={loading}
            autoComplete="username"
            minLength={3}
            maxLength={30}
            className="h-11 pl-8 bg-white/80 dark:bg-[#251D22]/80 border-stone/80 dark:border-white/15 focus-visible:border-wine focus-visible:ring-wine/20 text-charcoal dark:text-white placeholder:text-muted-faint"
          />
        </div>
      </div>

      {/* Email Address */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[13px] font-medium tracking-wide text-charcoal dark:text-stone"
        >
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="name@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
          className="h-11 bg-white/80 dark:bg-[#251D22]/80 border-stone/80 dark:border-white/15 focus-visible:border-wine focus-visible:ring-wine/20 text-charcoal dark:text-white placeholder:text-muted-faint"
        />
      </div>

      {/* Password with Visibility Toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-[13px] font-medium tracking-wide text-charcoal dark:text-stone"
          >
            Password
          </label>
          <span className="text-[11.5px] text-muted dark:text-stone/70">Min. 6 characters</span>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            minLength={6}
            className="h-11 pr-11 bg-white/80 dark:bg-[#251D22]/80 border-stone/80 dark:border-white/15 focus-visible:border-wine focus-visible:ring-wine/20 text-charcoal dark:text-white placeholder:text-muted-faint"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-charcoal dark:hover:text-white transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          className="h-11 w-full text-[14px] font-semibold bg-wine hover:bg-wine-hover text-white shadow-md shadow-wine/20 active:scale-[0.98] transition-all duration-150 border-t border-white/20"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account…</span>
            </span>
          ) : (
            'Create Account'
          )}
        </Button>
      </div>
    </form>
  );
}

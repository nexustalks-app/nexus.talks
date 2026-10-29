'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sanitizeRedirectPath } from '@/lib/security/redirect';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Unconfirmed email resend state
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Inspect search params on initial load
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const verifiedParam = searchParams.get('verified');

    if (errorParam === 'confirmation_failed') {
      setError(
        'The email confirmation link is invalid or has expired. Please sign in or request a new verification email below.'
      );
    } else if (errorParam === 'server_configuration_error') {
      setError('Authentication server configuration issue. Please contact support.');
    } else if (verifiedParam === 'true') {
      setNotice('Email verified successfully! Please sign in with your password to continue.');
    }
  }, [searchParams]);

  // Resend cooldown timer
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
    setNotice(null);
    setResendMessage(null);
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        const isNetworkOrDnsError =
          signInError.message === 'Failed to fetch' ||
          signInError.message.toLowerCase().includes('fetch') ||
          (signInError as { status?: number }).status === 0;

        const isUnconfirmed =
          signInError.message.toLowerCase().includes('email not confirmed') ||
          (signInError as { code?: string }).code === 'email_not_confirmed';

        if (isNetworkOrDnsError) {
          setError(
            'Unable to connect to the authentication server. Please check your internet connection or verify in the Supabase dashboard that your project is active and not paused.'
          );
        } else if (isUnconfirmed) {
          setUnconfirmedEmail(trimmedEmail);
          setError(
            'Your email address has not been confirmed yet. Please verify your email before signing in.'
          );
        } else if (
          signInError.message.toLowerCase().includes('invalid login credentials') ||
          signInError.message.toLowerCase().includes('invalid credentials')
        ) {
          setError('Invalid email address or password. Please verify your details and try again.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      // Update presence status to online
      if (data?.user) {
        await supabase
          .from('profiles')
          .update({
            status: 'online',
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', data.user.id);
      }

      // Check for safe redirect destination with open-redirect protection
      const redirectedFrom = searchParams.get('redirectedFrom');
      const safeDestination = sanitizeRedirectPath(redirectedFrom, '/conversations');

      router.push(safeDestination);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResendFromLogin = async () => {
    const targetEmail = unconfirmedEmail || email.trim().toLowerCase();
    if (!targetEmail || resendCooldown > 0 || resending) return;

    setResending(true);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo,
        },
      });

      if (resendErr) {
        if (resendErr.message.toLowerCase().includes('rate limit') || (resendErr as { status?: number }).status === 429) {
          setError('Email rate limit reached. Please wait a few minutes before requesting another link.');
        } else {
          setError(resendErr.message);
        }
        setResending(false);
        return;
      }

      setResendMessage(`Verification email resent to ${targetEmail}. Please check your inbox.`);
      setResendCooldown(60);
    } catch {
      setError('Failed to resend confirmation email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Notice Banner */}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800 dark:text-emerald-300 backdrop-blur-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <span className="flex-1">{notice}</span>
        </div>
      )}

      {/* Resend Confirmation Success Banner */}
      {resendMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800 dark:text-emerald-300 backdrop-blur-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <span className="flex-1">{resendMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-rose/30 bg-rose/10 dark:bg-rose/20 px-4 py-3 text-[13px] text-wine dark:text-[#F7B6C4] backdrop-blur-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-wine dark:text-[#F7B6C4] mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>

          {/* Actionable Resend Button for Unconfirmed Email */}
          {unconfirmedEmail && (
            <div className="pt-1.5 pl-6">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResendFromLogin}
                disabled={resendCooldown > 0 || resending}
                className="h-8 text-xs font-semibold border-wine/30 text-wine dark:text-[#F7B6C4] hover:bg-wine/10"
              >
                {resending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Resending…</span>
                  </span>
                ) : resendCooldown > 0 ? (
                  <span className="tabular-nums">Resend link in {resendCooldown}s</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    <span>Resend verification email</span>
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

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
          onChange={(e) => {
            setEmail(e.target.value);
            if (unconfirmedEmail && e.target.value.trim().toLowerCase() !== unconfirmedEmail) {
              setUnconfirmedEmail(null);
            }
          }}
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
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium text-wine dark:text-[#F7B6C4] hover:underline focus:outline-none focus:ring-1 focus:ring-wine rounded transition-colors"
          >
            Forgot password?
          </Link>
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
            autoComplete="current-password"
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
              <span>Signing in…</span>
            </span>
          ) : (
            'Sign In'
          )}
        </Button>
      </div>
    </form>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Inspect URL parameters for expiration or invalid token errors
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'expired' || errorParam === 'invalid') {
      setError('Your password reset link is invalid or has expired. Please request a new link below.');
    }
  }, [searchParams]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 || loading) return;

    setError(null);
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/auth/callback?type=recovery&next=/update-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (resetError) {
        // Specifically detect rate limits
        const isRateLimit =
          resetError.message.toLowerCase().includes('rate limit') ||
          (resetError as { status?: number }).status === 429;

        if (isRateLimit) {
          setError('Rate limit reached. Please wait a few minutes before requesting another reset email.');
          setLoading(false);
          return;
        }

        // For network/connectivity issues
        const isNetworkError =
          resetError.message === 'Failed to fetch' ||
          resetError.message.toLowerCase().includes('fetch');

        if (isNetworkError) {
          setError('Unable to reach the authentication service. Please check your connection and try again.');
          setLoading(false);
          return;
        }

        // To prevent user enumeration attacks, do NOT disclose if the email exists.
        // We log the error internally and still show the safe confirmation.
        console.warn('Password reset request error (non-enumerated):', resetError.message);
      }

      // Non-enumerating success response
      setSubmitted(true);
      setCooldown(60);
    } catch (err) {
      console.error('Unexpected error during password reset:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose/30 bg-rose/10 dark:bg-rose/20 px-4 py-3 text-[13px] text-wine dark:text-[#F7B6C4] backdrop-blur-sm leading-relaxed nx-fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-wine dark:text-[#F7B6C4] mt-0.5" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Non-Enumerating Success Confirmation */}
      {submitted ? (
        <div className="space-y-4 nx-fade-in">
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3.5 text-[13px] text-emerald-800 dark:text-emerald-300 backdrop-blur-sm leading-relaxed"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                Reset Link Dispatched
              </p>
              <p className="text-[12.5px] text-emerald-800/90 dark:text-emerald-300/90">
                If an account exists for <span className="font-medium underline">{email}</span>, you will receive password reset instructions shortly. Please check your inbox and spam folder.
              </p>
            </div>
          </div>

          <p className="text-[12px] text-muted dark:text-stone/70 px-1 leading-relaxed">
            The link is valid for a limited time. If you do not see the email within a couple of minutes, ensure the email address was spelled correctly or try requesting again below.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit}
              disabled={cooldown > 0 || loading}
              className="w-full sm:w-auto h-10 text-xs font-semibold border-stone-subtle dark:border-white/15 hover:bg-stone-subtle/50 dark:hover:bg-white/5"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Resending…</span>
                </span>
              ) : cooldown > 0 ? (
                <span className="tabular-nums">Resend available in {cooldown}s</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Resend reset link</span>
                </span>
              )}
            </Button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-wine dark:text-[#F7B6C4] hover:underline px-3 py-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="recovery-email"
              className="block text-[13px] font-medium tracking-wide text-charcoal dark:text-stone"
            >
              Email address
            </label>
            <div className="relative">
              <Input
                id="recovery-email"
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
            <p className="text-[12px] text-muted dark:text-stone/60">
              We will send a one-time secure recovery link to reset your credentials.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="h-11 w-full text-[14px] font-semibold bg-wine hover:bg-wine-hover text-white shadow-md shadow-wine/20 active:scale-[0.98] transition-all duration-150 border-t border-white/20"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending reset link…</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Send Reset Link</span>
                </span>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

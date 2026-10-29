'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function UpdatePasswordForm() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Verify that an active authenticated session exists (from recovery exchange)
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          setHasValidSession(false);
        } else {
          setHasValidSession(true);
        }
      } catch (err) {
        console.error('Session verification error:', err);
        setHasValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    }

    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect after brief delay
      setTimeout(() => {
        router.push('/conversations');
        router.refresh();
      }, 1800);
    } catch (err) {
      console.error('Update password error:', err);
      setError('An unexpected error occurred while updating your password. Please try again.');
      setLoading(false);
    }
  };

  // 1. Initial Session Check Skeleton
  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-wine" />
        <p className="text-xs text-muted dark:text-stone/60">Verifying security session…</p>
      </div>
    );
  }

  // 2. Invalid or Expired Session State
  if (!hasValidSession) {
    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-rose/30 bg-rose/10 dark:bg-rose/20 px-4 py-3.5 text-[13px] text-wine dark:text-[#F7B6C4] backdrop-blur-sm leading-relaxed"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-wine dark:text-[#F7B6C4] mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Reset Link Expired or Invalid</p>
              <p className="text-[12.5px] text-wine/90 dark:text-[#F7B6C4]/90">
                This password recovery session is no longer active or the link has already been used. For your security, reset links can only be used once.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 h-11 w-full rounded-xl bg-wine hover:bg-wine-hover text-white text-[14px] font-semibold shadow-md shadow-wine/20 transition-all duration-150 border-t border-white/20"
          >
            Request a New Reset Link
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-10 w-full text-xs font-medium text-muted hover:text-charcoal dark:hover:text-white transition-colors"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // 3. Success State
  if (success) {
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-4 text-[13px] text-emerald-800 dark:text-emerald-300 backdrop-blur-sm leading-relaxed"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-[14px]">
              Password Updated Successfully
            </p>
            <p className="text-[12.5px] text-emerald-800/90 dark:text-emerald-300/90">
              Your account password has been changed. You will now be redirected to your conversations.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              router.push('/conversations');
              router.refresh();
            }}
            className="h-11 w-full text-[14px] font-semibold bg-wine hover:bg-wine-hover text-white shadow-md shadow-wine/20 transition-all duration-150"
          >
            <span className="flex items-center justify-center gap-2">
              <span>Continue to Conversations</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </div>
      </div>
    );
  }

  // 4. Update Password Form
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose/30 bg-rose/10 dark:bg-rose/20 px-4 py-3 text-[13px] text-wine dark:text-[#F7B6C4] backdrop-blur-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-wine dark:text-[#F7B6C4] mt-0.5" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* New Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="new-password"
          className="block text-[13px] font-medium tracking-wide text-charcoal dark:text-stone"
        >
          New Password
        </label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            autoComplete="new-password"
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

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="block text-[13px] font-medium tracking-wide text-charcoal dark:text-stone"
        >
          Confirm New Password
        </label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            autoComplete="new-password"
            className="h-11 pr-11 bg-white/80 dark:bg-[#251D22]/80 border-stone/80 dark:border-white/15 focus-visible:border-wine focus-visible:ring-wine/20 text-charcoal dark:text-white placeholder:text-muted-faint"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-charcoal dark:hover:text-white transition-colors"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-2 pt-1 text-[12px] text-muted dark:text-stone/60">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Use at least 8 characters with letters and numbers.</span>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          className="h-11 w-full text-[14px] font-semibold bg-wine hover:bg-wine-hover text-white shadow-md shadow-wine/20 active:scale-[0.98] transition-all duration-150 border-t border-white/20"
          disabled={loading || !newPassword || !confirmPassword}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving New Password…</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              <span>Update Password</span>
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

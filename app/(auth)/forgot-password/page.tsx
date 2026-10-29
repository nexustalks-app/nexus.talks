import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Reset Password · Nexus.talks',
  description: 'Request a secure recovery link to reset your Nexus.talks password.',
};

function ForgotPasswordSkeleton() {
  return (
    <div className="flex h-44 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-wine" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-[34px] font-bold tracking-tight text-charcoal dark:text-white leading-tight">
          Reset Password
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted dark:text-stone/80">
          Enter your account email to receive a secure recovery link.
        </p>
      </div>

      <Suspense fallback={<ForgotPasswordSkeleton />}>
        <ForgotPasswordForm />
      </Suspense>

      <div className="mt-6 border-t border-stone-subtle dark:border-white/10 pt-5 flex flex-col gap-2.5 text-center text-[13px] text-muted dark:text-stone/70">
        <div>
          Remember your password?{' '}
          <Link
            href="/login"
            className="font-semibold text-wine dark:text-[#F7B6C4] underline-offset-4 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
        <div className="text-[12px]">
          Don&apos;t have an account yet?{' '}
          <Link
            href="/signup"
            className="font-medium text-wine dark:text-[#F7B6C4] hover:underline"
          >
            Create an account →
          </Link>
        </div>
      </div>
    </div>
  );
}

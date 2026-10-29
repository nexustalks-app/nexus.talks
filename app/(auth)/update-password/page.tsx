import { Suspense } from 'react';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Update Password · Nexus.talks',
  description: 'Choose a new secure password for your Nexus.talks account.',
};

function UpdatePasswordSkeleton() {
  return (
    <div className="flex h-44 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-wine" />
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-[34px] font-bold tracking-tight text-charcoal dark:text-white leading-tight">
          Update Password
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted dark:text-stone/80">
          Set a new strong password to protect your account.
        </p>
      </div>

      <Suspense fallback={<UpdatePasswordSkeleton />}>
        <UpdatePasswordForm />
      </Suspense>

      <div className="mt-6 border-t border-stone-subtle dark:border-white/10 pt-5 text-center text-[13px] text-muted dark:text-stone/70">
        Need to sign in with an existing password?{' '}
        <Link
          href="/login"
          className="font-semibold text-wine dark:text-[#F7B6C4] underline-offset-4 hover:underline transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

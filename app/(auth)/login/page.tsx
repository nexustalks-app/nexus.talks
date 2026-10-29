import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Sign In · Nexus.talks',
  description: 'Enter your credentials to access your private conversations.',
};

function LoginFormSkeleton() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-wine" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-[34px] font-bold tracking-tight text-charcoal dark:text-white leading-tight">
          Welcome Back
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted dark:text-stone/80">
          Enter your credentials to access your private conversations.
        </p>
      </div>

      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>

      <div className="mt-6 border-t border-stone-subtle dark:border-white/10 pt-5 flex flex-col gap-2.5 text-center text-[13px] text-muted dark:text-stone/70">
        <div>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-wine dark:text-[#F7B6C4] underline-offset-4 hover:underline transition-colors"
          >
            Create an account
          </Link>
        </div>
        <div className="text-[12px]">
          Just exploring?{' '}
          <Link
            href="/demo"
            className="font-medium text-wine dark:text-[#F7B6C4] hover:underline"
          >
            See an interactive demo →
          </Link>
        </div>
      </div>
    </div>
  );
}

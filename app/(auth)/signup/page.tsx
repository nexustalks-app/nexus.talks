import { SignupForm } from '@/components/auth/signup-form';
import Link from 'next/link';

export const metadata = {
  title: 'Create Account · Nexus.talks',
  description: 'Join Nexus.talks for private, direct communication in real time.',
};

export default function SignupPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-[34px] font-bold tracking-tight text-charcoal dark:text-white leading-tight">
          Create Account
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted dark:text-stone/80">
          Join Nexus.talks to begin private, direct conversation.
        </p>
      </div>

      <SignupForm />

      <div className="mt-6 border-t border-stone-subtle dark:border-white/10 pt-5 flex flex-col gap-2.5 text-center text-[13px] text-muted dark:text-stone/70">
        <div>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-wine dark:text-[#F7B6C4] underline-offset-4 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
        <div className="text-[12px]">
          Want to test first?{' '}
          <Link
            href="/demo"
            className="font-medium text-wine dark:text-[#F7B6C4] hover:underline"
          >
            Explore the live demo →
          </Link>
        </div>
      </div>
    </div>
  );
}

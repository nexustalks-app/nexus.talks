import Link from 'next/link';
import { Users, Settings, Sparkles, ShieldCheck } from 'lucide-react';
import { UserAvatar } from '@/components/user/user-avatar';
import { isCreatorIdentity } from '@/components/user/nexus-avatar-3d';
import { NexusMark } from '@/components/ui/nexus-mark';
import { cn } from '@/lib/utils/cn';

interface EmptyConversationProps {
  title?: string;
  description?: string;
  participantName?: string;
  participantAvatar?: string | null;
  participantUsername?: string;
  showActions?: boolean;
  className?: string;
}

export function EmptyConversation({
  title = 'Your Messages Workspace',
  description = 'Select a conversation from the list to view message history, or connect with colleagues in your directory.',
  participantName,
  participantAvatar,
  participantUsername,
  showActions = true,
  className,
}: EmptyConversationProps) {
  const isPersonalChatStart = Boolean(participantName);

  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-16 text-center select-none bg-transparent", className)}>
      <div className="mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl p-8 bg-[var(--surface)]/95 backdrop-blur-sm border border-[var(--border)] shadow-md animate-fade-in">
        {/* Avatar or Signature Nexus Motif */}
        {isPersonalChatStart ? (
          <div className="mb-4 relative">
            <UserAvatar
              id={participantUsername || participantName!}
              display_name={participantName!}
              avatar_url={participantAvatar ?? null}
              size="lg"
              showCreatorBadge={isCreatorIdentity(participantName) || isCreatorIdentity(participantUsername)}
              className="!h-16 !w-16 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-wine text-white shadow-xs">
              <Sparkles className="h-3 w-3" />
            </span>
          </div>
        ) : (
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-wine/10 to-burgundy/15 dark:from-wine/25 dark:to-burgundy/30 text-wine dark:text-[#F3B3C2] shadow-sm border border-wine/15 dark:border-wine/25">
            <NexusMark variant="hero" size={40} />
          </div>
        )}

        {/* Signature Constellation Accent */}
        <NexusMark variant="constellation" size={15} className="mb-2.5 opacity-80" />

        {/* Title */}
        <h2 className="font-bold text-xl sm:text-2xl tracking-tight text-charcoal dark:text-foreground">
          {isPersonalChatStart ? `Chat with ${participantName}` : title}
        </h2>

        {/* Subtitle / Description */}
        <p className="mt-2 max-w-sm text-[13px] sm:text-[13.5px] leading-relaxed text-muted dark:text-muted-foreground">
          {isPersonalChatStart
            ? (participantUsername ? `@${participantUsername} is waiting for your hello. Send a message below to start chatting.` : description)
            : description}
        </p>

        {/* Action buttons (only when showActions is true and not inside an open chat) */}
        {showActions && !isPersonalChatStart && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/people"
              className="inline-flex items-center gap-2 rounded-xl bg-wine px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-wine-hover active:scale-95"
            >
              <Users className="h-4 w-4" />
              <span>Discover People</span>
            </Link>

            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[12.5px] font-medium text-charcoal dark:text-foreground shadow-sm transition-[background-color,border-color,transform] duration-150 ease-out hover:bg-[var(--row-hover)] active:scale-95"
            >
              <Settings className="h-4 w-4 text-muted dark:text-muted-foreground" />
              <span>Settings</span>
            </Link>
          </div>
        )}

        {isPersonalChatStart && (
          <div className="mt-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] text-[11.5px] text-muted dark:text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>End-to-end encrypted session</span>
          </div>
        )}
      </div>
    </div>
  );
}

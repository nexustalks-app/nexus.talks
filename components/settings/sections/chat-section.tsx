'use client';

import React from 'react';
import { CornerDownLeft, Eye, Clock, BellDot, CheckSquare } from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils/cn';

export function ChatSection() {
  const { settings, updateChat } = useSettings();
  const {
    sendOnEnter,
    showTimestamps,
    showMessagePreviews,
    unreadIndicator,
    confirmClearDraft,
  } = settings.chat;

  return (
    <div className="space-y-8">
      {/* Keyboard & Sending Behavior */}
      <section aria-labelledby="sending-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
            <CornerDownLeft className="h-5 w-5" />
          </div>
          <div>
            <h2 id="sending-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Send Message Shortcut
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Choose the keyboard action that submits your typed message.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => updateChat({ sendOnEnter: 'enter' })}
            className={cn(
              'flex flex-col items-start rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
              sendOnEnter === 'enter'
                ? 'border-wine bg-wine/5 dark:bg-wine/15 shadow-sm'
                : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] hover:bg-porcelain/60 dark:hover:bg-[#2D2329]'
            )}
          >
            <span className="text-sm font-semibold text-charcoal dark:text-foreground">
              Enter to Send
            </span>
            <span className="mt-1 text-xs text-muted dark:text-muted-foreground leading-relaxed">
              Press <kbd className="rounded border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#20181D] text-charcoal dark:text-foreground px-1 py-0.5 text-[11px] font-sans">Enter</kbd> to send, and <kbd className="rounded border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#20181D] text-charcoal dark:text-foreground px-1 py-0.5 text-[11px] font-sans">Shift + Enter</kbd> for a new line.
            </span>
          </button>

          <button
            type="button"
            onClick={() => updateChat({ sendOnEnter: 'ctrlEnter' })}
            className={cn(
              'flex flex-col items-start rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
              sendOnEnter === 'ctrlEnter'
                ? 'border-wine bg-wine/5 dark:bg-wine/15 shadow-sm'
                : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] hover:bg-porcelain/60 dark:hover:bg-[#2D2329]'
            )}
          >
            <span className="text-sm font-semibold text-charcoal dark:text-foreground">
              Ctrl / Cmd + Enter to Send
            </span>
            <span className="mt-1 text-xs text-muted dark:text-muted-foreground leading-relaxed">
              Press <kbd className="rounded border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#20181D] text-charcoal dark:text-foreground px-1 py-0.5 text-[11px] font-sans">Enter</kbd> for a regular new line, and <kbd className="rounded border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#20181D] text-charcoal dark:text-foreground px-1 py-0.5 text-[11px] font-sans">Ctrl + Enter</kbd> to send.
            </span>
          </button>
        </div>
      </section>

      {/* Message Content & Visibility */}
      <section aria-labelledby="visibility-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="visibility-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Content & Visibility Preferences
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Manage how message content and timestamps appear in conversations.
        </p>

        <div className="mt-5 divide-y divide-stone-subtle dark:divide-[#382832]/60">
          {/* Show Timestamps */}
          <div className="flex items-center justify-between py-4 first:pt-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="timestamps-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Always Show Timestamps
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Displays the exact dispatch time at the bottom of each message bubble. When off, times reveal on hover.
                </p>
              </div>
            </div>
            <Switch
              id="timestamps-toggle"
              checked={showTimestamps}
              onCheckedChange={(val) => updateChat({ showTimestamps: val })}
              aria-label="Always show timestamps"
            />
          </div>

          {/* Show Message Previews */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="previews-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Conversation List Previews
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Shows snippets of the latest message in the left sidebar. Disable to preserve privacy on shared screens.
                </p>
              </div>
            </div>
            <Switch
              id="previews-toggle"
              checked={showMessagePreviews}
              onCheckedChange={(val) => updateChat({ showMessagePreviews: val })}
              aria-label="Conversation list message previews"
            />
          </div>

          {/* Confirm Clear Draft */}
          <div className="flex items-center justify-between py-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="draft-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Protect Unsent Drafts
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Prevents accidental loss of typed composer text when navigating away from an ongoing conversation.
                </p>
              </div>
            </div>
            <Switch
              id="draft-toggle"
              checked={confirmClearDraft}
              onCheckedChange={(val) => updateChat({ confirmClearDraft: val })}
              aria-label="Protect unsent drafts"
            />
          </div>
        </div>
      </section>

      {/* Unread Indicator Style */}
      <section aria-labelledby="unread-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
            <BellDot className="h-5 w-5" />
          </div>
          <div>
            <h2 id="unread-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Unread Indicator Style
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Choose how unread message badges are presented across conversation items.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => updateChat({ unreadIndicator: 'badge' })}
            className={cn(
              'flex items-center justify-between rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
              unreadIndicator === 'badge'
                ? 'border-wine bg-wine/5 dark:bg-wine/15 shadow-sm'
                : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] hover:bg-porcelain/60 dark:hover:bg-[#2D2329]'
            )}
          >
            <div>
              <span className="text-sm font-semibold text-charcoal dark:text-foreground">Count Badge</span>
              <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">Displays the numerical unread count</p>
            </div>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-white shadow-sm">
              3
            </span>
          </button>

          <button
            type="button"
            onClick={() => updateChat({ unreadIndicator: 'dot' })}
            className={cn(
              'flex items-center justify-between rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
              unreadIndicator === 'dot'
                ? 'border-wine bg-wine/5 dark:bg-wine/15 shadow-sm'
                : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] hover:bg-porcelain/60 dark:hover:bg-[#2D2329]'
            )}
          >
            <div>
              <span className="text-sm font-semibold text-charcoal dark:text-foreground">Minimal Dot</span>
              <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">Subtle wine accent indicator without numbers</p>
            </div>
            <span className="h-3 w-3 rounded-full bg-wine shadow-sm" />
          </button>
        </div>
      </section>
    </div>
  );
}

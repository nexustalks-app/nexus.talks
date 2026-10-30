'use client';

import { useEffect, useRef } from 'react';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { MessageWithReactions } from './message-item';

interface DeleteMessageModalProps {
  isOpen: boolean;
  message: MessageWithReactions | null;
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteMessageModal({
  isOpen,
  message,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteMessageModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus safe Cancel button on open
      cancelBtnRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isDeleting) {
          onCancel();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !message) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs nx-backdrop-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
    >
      <div className="liquid-glass-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl nx-dialog-enter">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="delete-dialog-title"
              className="text-base font-bold text-charcoal dark:text-foreground"
            >
              Delete message?
            </h2>
            <p
              id="delete-dialog-description"
              className="mt-1 text-xs text-muted dark:text-muted-foreground leading-relaxed"
            >
              This will remove this message for everyone in the conversation. Quoted replies will indicate the original message was deleted. This action cannot be undone.
            </p>

            {/* Truncated message snippet preview */}
            <div className="mt-3 rounded-xl border border-stone-subtle dark:border-[#33252E] bg-porcelain dark:bg-[#251D22] p-2.5 text-xs text-charcoal/80 dark:text-foreground/80 line-clamp-3 select-text italic">
              &ldquo;{message.content}&rdquo;
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-2.5 text-xs text-red-600 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="rounded-xl border border-stone dark:border-[#3B2C34] bg-transparent px-4 py-2 text-xs font-semibold text-charcoal dark:text-stone hover:bg-stone/30 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50',
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              <span>Delete for everyone</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

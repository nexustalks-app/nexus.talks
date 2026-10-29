'use client';

import { useState, useEffect, useRef } from 'react';
import { Bookmark, Lock, Loader2, Trash2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EchoTargetMessage {
  id: string;
  content: string;
  senderName?: string;
  createdAt?: string;
}

interface EchoNoteModalProps {
  isOpen: boolean;
  message: EchoTargetMessage | null;
  existingNote?: string | null;
  isEchoed?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onSave: (note: string) => Promise<void> | void;
  onUnsave?: () => Promise<void> | void;
  onClose: () => void;
}

export function EchoNoteModal({
  isOpen,
  message,
  existingNote = '',
  isEchoed = false,
  isSaving = false,
  error,
  onSave,
  onUnsave,
  onClose,
}: EchoNoteModalProps) {
  const [note, setNote] = useState(existingNote || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNote(existingNote || '');
      setLocalError(null);
      setTimeout(() => textareaRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSaving && !isDeleting) {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, existingNote, isSaving, isDeleting, onClose]);

  if (!isOpen || !message) return null;

  const displayError = error || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isDeleting) return;
    setLocalError(null);
    try {
      await onSave(note.trim());
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to save echo. Please try again.');
    }
  };

  const handleUnsave = async () => {
    if (isSaving || isDeleting || !onUnsave) return;
    setLocalError(null);
    setIsDeleting(true);
    try {
      await onUnsave();
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to remove echo. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="echo-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border border-stone/80 dark:border-[#4A3843] liquid-glass-card p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-subtle dark:border-[#382C34]/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
              <Bookmark className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2
                id="echo-modal-title"
                className="text-lg font-bold tracking-tight text-charcoal dark:text-foreground"
              >
                {isEchoed ? 'Edit Echo Moment' : 'Save to Nexus Echoes'}
              </h2>
              <p className="text-xs text-muted dark:text-muted-foreground">
                Bookmark and preserve this conversation moment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="rounded-lg p-1 text-muted hover:text-charcoal hover:bg-stone/40 dark:hover:bg-wine/15 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quoted Message Preview */}
        <div className="mt-4 rounded-xl border border-stone-subtle dark:border-[#382C34] bg-porcelain/60 dark:bg-[#251D22]/60 p-3">
          <div className="flex items-center justify-between text-xs text-muted dark:text-muted-foreground mb-1">
            <span className="font-semibold text-wine dark:text-[#F3B3C2]">
              {message.senderName || 'Participant'}
            </span>
            {message.createdAt && (
              <span className="tabular-nums">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className="text-sm text-charcoal dark:text-stone line-clamp-3 italic">
            &ldquo;{message.content}&rdquo;
          </p>
        </div>

        {/* Error Alert Banner */}
        {displayError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200/80 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="echo-private-note"
              className="block text-xs font-semibold text-charcoal dark:text-foreground mb-1.5"
            >
              Private Personal Note <span className="text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="echo-private-note"
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              placeholder="Why does this moment matter? Add insights, ideas, or reminders..."
              rows={3}
              maxLength={2000}
              disabled={isSaving || isDeleting}
              className="w-full resize-none rounded-xl border border-stone dark:border-[#3B2C34] bg-white dark:bg-[#271E24] p-3 text-sm text-charcoal dark:text-foreground placeholder:text-muted focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine transition-all"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted">
              <span className="flex items-center gap-1 text-wine/80 dark:text-[#F3B3C2]/80">
                <Lock className="h-3 w-3" />
                Strictly private — only visible to you
              </span>
              <span className="tabular-nums">{note.length} / 2000</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-subtle dark:border-[#382C34]/60">
            {isEchoed && onUnsave ? (
              <button
                type="button"
                onClick={handleUnsave}
                disabled={isSaving || isDeleting}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Unsave from Echoes
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="rounded-xl border border-stone dark:border-[#3B2C34] px-4 py-2 text-xs font-medium text-charcoal dark:text-stone hover:bg-stone/30 dark:hover:bg-[#2A2027] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-wine hover:bg-wine-hover text-white px-4 py-2 text-xs font-medium shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5" />}
                {isEchoed ? 'Save Changes' : 'Save to Echoes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Check,
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  Undo2,
  Camera,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/user/user-avatar';
import {
  ALL_AVATARS,
  MALE_AVATARS,
  FEMALE_AVATARS,
  type AvatarItem,
} from '@/lib/avatar/avatar-collection';
import { cn } from '@/lib/utils/cn';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string | null;
  userId?: string;
  displayName: string;
  username?: string;
  onSuccess?: (newAvatarUrl: string | null) => void;
}

type CategoryTab = 'all' | 'male' | 'female';

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userId,
  displayName,
  username,
  onSuccess,
}: AvatarPickerModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state whenever modal opens or currentAvatarUrl changes
  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentAvatarUrl);
      setError(null);
      setSaveSuccess(false);
    }
  }, [isOpen, currentAvatarUrl]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayedAvatars: AvatarItem[] =
    activeTab === 'male'
      ? MALE_AVATARS
      : activeTab === 'female'
      ? FEMALE_AVATARS
      : ALL_AVATARS;

  // Find info about currently selected avatar
  const matchingAvatarItem = ALL_AVATARS.find((a) => a.url === selectedUrl);
  const isCustomUpload =
    selectedUrl !== null &&
    !ALL_AVATARS.some((a) => a.url === selectedUrl);
  const isMonogram = selectedUrl === null;

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image is too large. Please select an image under 8MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            setSelectedUrl(dataUrl);
          } else {
            setSelectedUrl(event.target?.result as string);
          }
        } catch {
          setSelectedUrl(event.target?.result as string);
        }
      };
      img.onerror = () => {
        setError('Failed to process image file.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError('Failed to read selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      let targetUserId = userId;

      // If userId wasn't passed directly, get authenticated user
      if (!targetUserId) {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Authentication required to save profile avatar.');
        }
        targetUserId = user.id;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: selectedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSaveSuccess(true);
      if (onSuccess) {
        onSuccess(selectedUrl);
      }
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save avatar.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 dark:bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-stone dark:border-[#382832] bg-white dark:bg-[#1E161C] shadow-2xl overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-subtle dark:border-[#2C2127] px-6 py-4.5 bg-porcelain/60 dark:bg-[#251D23]/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
              <Camera className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2
                id="avatar-picker-title"
                className="text-base font-bold text-charcoal dark:text-foreground font-serif tracking-tight"
              >
                Choose Your Avatar
              </h2>
              <p className="text-[11.5px] text-muted dark:text-muted-foreground">
                Select from 25 handcrafted 3D avatars, upload a photo, or use your monogram.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-stone/40 dark:hover:bg-[#342730] hover:text-charcoal dark:hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close avatar picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar">
          {/* Live Preview Card */}
          <div className="rounded-2xl border border-stone-subtle dark:border-[#2F232B] bg-porcelain/40 dark:bg-[#241C22]/50 p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative shrink-0">
              <UserAvatar
                id={username || displayName}
                display_name={displayName}
                avatar_url={selectedUrl}
                size="xl"
                className="!h-20 !w-20 shadow-md ring-2 ring-wine/30 dark:ring-wine/40"
              />
              {selectedUrl === currentAvatarUrl && (
                <span
                  title="Current saved avatar"
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs border-2 border-white dark:border-[#1E161C]"
                >
                  <Check className="h-3 w-3 stroke-[2.5]" />
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-charcoal dark:text-foreground">
                  {matchingAvatarItem
                    ? matchingAvatarItem.name
                    : isCustomUpload
                    ? 'Custom Uploaded Photo'
                    : '3D Monogram Initial Medallion'}
                </span>
                <span className="text-[10.5px] font-mono text-muted dark:text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-subtle/80 dark:bg-[#342730]">
                  {matchingAvatarItem
                    ? matchingAvatarItem.id
                    : isCustomUpload
                    ? 'Uploaded'
                    : 'Default'}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-muted dark:text-muted-foreground">
                This is how your profile picture appears across chats, headers, and discovery.
              </p>

              {/* Fast Action Buttons */}
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#2A2027] px-3 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-stone/40 dark:hover:bg-[#342831] hover:text-wine dark:hover:text-[#F3B3C2] transition-colors shadow-2xs active:scale-95"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Custom Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUrl(null)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs active:scale-95',
                    isMonogram
                      ? 'border-wine bg-wine/10 text-wine dark:text-[#F3B3C2] dark:border-wine/40'
                      : 'border-stone dark:border-[#382832] bg-white dark:bg-[#2A2027] text-charcoal dark:text-foreground hover:bg-stone/40 dark:hover:bg-[#342831]'
                  )}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>Use 3D Monogram</span>
                </button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-between border-b border-stone-subtle dark:border-[#2C2127] pb-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${ALL_AVATARS.length})` },
                  { id: 'male', label: `Male (${MALE_AVATARS.length})` },
                  { id: 'female', label: `Female (${FEMALE_AVATARS.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                    activeTab === tab.id
                      ? 'bg-wine text-white shadow-xs'
                      : 'text-muted hover:text-charcoal dark:hover:text-foreground hover:bg-stone/30 dark:hover:bg-[#2A2027]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted">
              <Sparkles className="h-3 w-3 text-wine dark:text-[#F3B3C2]" />
              <span>3D Clay & Vinyl Collection</span>
            </div>
          </div>

          {/* 25-Avatar Selection Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[290px] overflow-y-auto pr-1 no-scrollbar">
            {displayedAvatars.map((avatar) => {
              const isSelected = selectedUrl === avatar.url;

              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedUrl(avatar.url)}
                  className={cn(
                    'group relative flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all duration-150',
                    isSelected
                      ? 'bg-wine/10 dark:bg-wine/20 ring-2 ring-wine dark:ring-[#F3B3C2] shadow-sm'
                      : 'hover:bg-porcelain dark:hover:bg-[#271E25] hover:scale-105 active:scale-95'
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Select ${avatar.name} (${avatar.id})`}
                >
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border border-stone/80 dark:border-white/10 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />

                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-wine/30 backdrop-blur-[1px]">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-wine text-white shadow-xs">
                          <Check className="h-3 w-3 stroke-[2.8]" />
                        </span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-charcoal dark:text-foreground text-center truncate max-w-full leading-tight">
                    {avatar.name.split('/')[0].trim()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Flash */}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>Profile picture updated successfully!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-stone-subtle dark:border-[#2C2127] px-6 py-4 bg-porcelain/60 dark:bg-[#251D23]/60">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#2A2027] px-4 py-2 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-stone/40 dark:hover:bg-[#342831] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || selectedUrl === currentAvatarUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-wine px-5 py-2 text-xs font-semibold text-white shadow-md shadow-wine/25 transition-all hover:bg-wine-hover active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Avatar…</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Save Avatar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

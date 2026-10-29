'use client';

import { useState, useId, useEffect } from 'react';
import { X, Check, RotateCcw, Palette, Sparkles, Image as ImageIcon } from 'lucide-react';
import {
  BUILT_IN_CHAT_THEMES,
  BACKGROUND_OPTIONS,
  type BuiltInThemeId,
  type BackgroundPatternId,
  type ConversationThemePreference,
  DEFAULT_THEME_PREFERENCE,
  getChatThemeStyles,
} from '@/lib/theme/chat-theme';
import { useSettings } from '@/lib/settings/settings-context';
import { cn } from '@/lib/utils/cn';

interface ChatThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreference: ConversationThemePreference;
  onApplyTheme: (preference: ConversationThemePreference) => void;
  onResetTheme: () => void;
  participantName?: string;
}

export function ChatThemePickerModal({
  isOpen,
  onClose,
  currentPreference,
  onApplyTheme,
  onResetTheme,
  participantName = 'Participant',
}: ChatThemePickerModalProps) {
  const { isDarkTheme } = useSettings();
  const [selectedThemeId, setSelectedThemeId] = useState<BuiltInThemeId>(currentPreference.themeId);
  const [selectedBgId, setSelectedBgId] = useState<BackgroundPatternId>(currentPreference.backgroundId);
  const titleId = useId();

  // Keep in sync when modal opens or conversation changes
  useEffect(() => {
    if (isOpen) {
      setSelectedThemeId(currentPreference.themeId);
      setSelectedBgId(currentPreference.backgroundId);
    }
  }, [isOpen, currentPreference]);

  if (!isOpen) return null;

  const previewPreference: ConversationThemePreference = {
    themeId: selectedThemeId,
    backgroundId: selectedBgId,
  };

  const previewStyles = getChatThemeStyles(previewPreference, isDarkTheme);
  const isCustomized = selectedThemeId !== 'default' || selectedBgId !== 'default';

  const handleApply = () => {
    onApplyTheme(previewPreference);
    onClose();
  };

  const handleReset = () => {
    onResetTheme();
    setSelectedThemeId('default');
    setSelectedBgId('default');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl bg-white dark:bg-[#181116] border border-stone-subtle dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ────────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-center justify-between px-5 sm:px-6 py-4 border-b border-stone/80 dark:border-white/10 bg-white/80 dark:bg-[#181116]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h2 id={titleId} className="text-base sm:text-lg font-semibold tracking-tight text-charcoal dark:text-[#EDE8EC]">
                Personal Chat Theme
              </h2>
              <p className="text-xs text-muted dark:text-[#9A9498]">
                Customized for your chat with <span className="font-medium text-charcoal dark:text-foreground">{participantName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close theme picker"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-charcoal dark:hover:text-foreground hover:bg-stone/30 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* ── Modal Body: Live Preview & Selectors ────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone/80 dark:divide-white/10">
          {/* Left Column: Realistic Live Preview ──────────────────────────────── */}
          <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between bg-porcelain/40 dark:bg-black/20">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-[#9A9498] flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-wine dark:text-[#E2A6B3]" />
                  Live Preview
                </span>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] font-medium">
                  {BUILT_IN_CHAT_THEMES[selectedThemeId]?.name}
                </span>
              </div>

              {/* Realistic Chat Window Simulation */}
              <div
                className="relative rounded-2xl border border-stone/80 dark:border-white/10 shadow-sm p-4 overflow-hidden min-h-[290px] sm:min-h-[340px] flex flex-col justify-end transition-all duration-200"
                style={{
                  backgroundColor: (previewStyles as any)['--pane-chat-bg'],
                  backgroundImage: (previewStyles as any)['--canvas-pattern'],
                  backgroundSize: '220px 220px',
                  backgroundRepeat: 'repeat',
                }}
              >
                {/* Simulated Date Badge */}
                <div className="my-auto self-center flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase bg-black/[0.04] dark:bg-white/5 text-[#6c6770] dark:text-white/40 border border-black/[0.04] dark:border-white/[0.05] select-none">
                  Today
                </div>

                <div className="space-y-3 mt-auto">
                  {/* Incoming Sample Message */}
                  <div className="flex flex-col items-start max-w-[85%]">
                    <span className="text-[10px] font-medium text-muted dark:text-[#8E868C] ml-1 mb-1">
                      {participantName}
                    </span>
                    <div
                      className="px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-xs border"
                      style={{
                        backgroundColor: (previewStyles as any)['--chat-incoming-bg'],
                        color: (previewStyles as any)['--chat-incoming-text'],
                        borderColor: (previewStyles as any)['--chat-incoming-border'],
                        boxShadow: (previewStyles as any)['--chat-incoming-shadow'],
                        borderRadius: '16px 16px 16px 4px',
                      }}
                    >
                      <p>Let&apos;s review the architectural layout for the gallery exhibition.</p>
                      <div className="mt-1 flex justify-end">
                        <span className="text-[9.5px] font-mono opacity-65">10:48 AM</span>
                      </div>
                    </div>
                  </div>

                  {/* Outgoing Sample Message */}
                  <div className="flex flex-col items-end self-end max-w-[85%]">
                    <div
                      className="px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-xs border text-right"
                      style={{
                        background: (previewStyles as any)['--chat-outgoing-bg'],
                        color: (previewStyles as any)['--chat-outgoing-text'],
                        borderColor: (previewStyles as any)['--chat-outgoing-border'],
                        boxShadow: (previewStyles as any)['--chat-outgoing-shadow'],
                        borderRadius: '16px 16px 4px 16px',
                      }}
                    >
                      <p>Agreed. The tactile material finishes look exceptional.</p>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span className="text-[9.5px] font-mono opacity-80">10:49 AM</span>
                        <span className="text-[10px] opacity-90">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-muted-faint dark:text-[#8E868C] text-center">
              Changes apply exclusively to this conversation and persist across visits.
            </p>
          </div>

          {/* Right Column: Theme & Background Options ─────────────────────────── */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-6">
            {/* Section 1: Curated Palettes */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal dark:text-[#EDE8EC]">
                  1. Curated Palettes
                </h3>
                <span className="text-[11px] text-muted dark:text-[#9A9498]">6 handcrafted themes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(BUILT_IN_CHAT_THEMES).map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      data-theme-option={theme.id}
                      title={theme.name}
                      onClick={() => setSelectedThemeId(theme.id)}
                      className={cn(
                        'group flex items-start gap-3 p-3 rounded-2xl text-left border transition-all duration-150',
                        isSelected
                          ? 'border-wine dark:border-[#F3B3C2] bg-wine/[0.04] dark:bg-wine/15 shadow-xs ring-1 ring-wine/40 dark:ring-[#F3B3C2]/40'
                          : 'border-stone/80 dark:border-white/10 bg-white dark:bg-[#1E161C] hover:border-stone-strong dark:hover:border-white/20'
                      )}
                    >
                      {/* Swatch preview token */}
                      <div className="relative shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-black/10 dark:border-white/15 overflow-hidden shadow-2xs mt-0.5">
                        <div
                          className="absolute inset-0 w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${theme.swatch.primary} 0%, ${theme.swatch.secondary} 100%)`,
                          }}
                        />
                        <div
                          className="absolute bottom-0 right-0 h-4 w-4 rounded-tl-full border-t border-l border-white/20"
                          style={{ backgroundColor: theme.swatch.surface }}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Check className="h-4 w-4 text-white stroke-[2.5]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-charcoal dark:text-[#EDE8EC]">
                            {theme.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted dark:text-[#9A9498] line-clamp-1 mt-0.5">
                          {theme.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Wallpaper Backgrounds */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal dark:text-[#EDE8EC] flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-wine dark:text-[#E2A6B3]" />
                  2. Wallpaper Background
                </h3>
                <span className="text-[11px] text-muted dark:text-[#9A9498]">Pattern styling</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {BACKGROUND_OPTIONS.map((bg) => {
                  const isSelected = selectedBgId === bg.id;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      data-bg-option={bg.id}
                      title={bg.name}
                      onClick={() => setSelectedBgId(bg.id)}
                      className={cn(
                        'flex flex-col p-2.5 rounded-xl text-left border transition-all duration-150',
                        isSelected
                          ? 'border-wine dark:border-[#F3B3C2] bg-wine/[0.04] dark:bg-wine/15 shadow-xs ring-1 ring-wine/30'
                          : 'border-stone/80 dark:border-white/10 bg-white dark:bg-[#1E161C] hover:border-stone-strong dark:hover:border-white/20'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-charcoal dark:text-[#EDE8EC] truncate">
                          {bg.name}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-wine dark:text-[#F3B3C2] shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted dark:text-[#9A9498] line-clamp-1">
                        {bg.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────────────── */}
        <footer className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-stone/80 dark:border-white/10 bg-white/90 dark:bg-[#181116]/90 backdrop-blur-md">
          <div>
            {isCustomized ? (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-charcoal dark:hover:text-foreground hover:bg-stone/30 dark:hover:bg-white/10 transition-colors"
                title="Restore default conversation appearance"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Default</span>
              </button>
            ) : (
              <span className="text-[11.5px] text-muted-faint dark:text-[#8E868C]">
                Using standard Nexus default
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal dark:text-foreground hover:bg-stone/30 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply to this Chat</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

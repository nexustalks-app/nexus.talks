'use client';

import React from 'react';
import { Sun, Moon, Laptop, Check, Sparkles, Palette } from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import {
  ThemeMode,
  MessageTextSize,
  MessageSpacing,
  ChatDensity,
  BubbleStyle,
} from '@/lib/settings/settings-types';
import { cn } from '@/lib/utils/cn';

interface ThemeOption {
  id: ThemeMode;
  label: string;
  badge?: string;
  icon: React.ElementType;
  desc: string;
  palette: {
    bg: string;
    surface: string;
    border: string;
    accent: string;
  };
}

export function AppearanceSection() {
  const { settings, updateAppearance, resolvedTheme } = useSettings();
  const { theme, messageTextSize, messageSpacing, chatDensity, bubbleStyle } =
    settings.appearance;

  const THEMES: ThemeOption[] = [
    {
      id: 'light',
      label: 'Porcelain Light',
      badge: 'Default',
      icon: Sun,
      desc: 'Luminous porcelain with crisp white cards and deep wine accents.',
      palette: {
        bg: '#F9F8F6',
        surface: '#FFFFFF',
        border: '#E5E0DC',
        accent: '#582030',
      },
    },
    {
      id: 'dark',
      label: 'Obsidian Dark',
      icon: Moon,
      desc: 'Deep Obsidian base with plum elevated surfaces and glowing wine.',
      palette: {
        bg: '#0E0B0D',
        surface: '#1A1418',
        border: '#2A1F25',
        accent: '#8E344E',
      },
    },
    {
      id: 'midnight-wine',
      label: 'Midnight Wine',
      badge: 'Rich',
      icon: Sparkles,
      desc: 'Rich near-black with deep burgundy layers and rose highlights.',
      palette: {
        bg: '#10080D',
        surface: '#20101B',
        border: '#381A2F',
        accent: '#A23652',
      },
    },
    {
      id: 'arctic-porcelain',
      label: 'Arctic Porcelain',
      badge: 'Cool Light',
      icon: Palette,
      desc: 'Cool-neutral light surfaces with architectural grey separation.',
      palette: {
        bg: '#F4F5F8',
        surface: '#FFFFFF',
        border: '#DCE0E7',
        accent: '#521F2D',
      },
    },
    {
      id: 'graphite',
      label: 'Graphite',
      badge: 'Minimal',
      icon: Laptop,
      desc: 'Balanced neutral dark-grey surfaces with quiet restrained wine.',
      palette: {
        bg: '#121316',
        surface: '#1E2127',
        border: '#2C313A',
        accent: '#7A2E41',
      },
    },
    {
      id: 'system',
      label: 'System Auto',
      icon: Laptop,
      desc: 'Synchronizes automatically with your operating system preference.',
      palette: {
        bg: '#EBEBEB',
        surface: '#FFFFFF',
        border: '#CCCCCC',
        accent: '#582030',
      },
    },
  ];

  const TEXT_SIZES: { id: MessageTextSize; label: string; px: string }[] = [
    { id: 'small', label: 'Small', px: '12.5px' },
    { id: 'medium', label: 'Medium', px: '14px' },
    { id: 'large', label: 'Large', px: '16px' },
  ];

  const SPACINGS: { id: MessageSpacing; label: string; desc: string }[] = [
    { id: 'compact', label: 'Compact', desc: 'Tighter gaps between message bubbles' },
    { id: 'comfortable', label: 'Comfortable', desc: 'Balanced default reading rhythm' },
    { id: 'relaxed', label: 'Relaxed', desc: 'More open breathing room between turns' },
  ];

  const DENSITIES: { id: ChatDensity; label: string; desc: string }[] = [
    { id: 'comfortable', label: 'Comfortable', desc: 'Standard item padding in chats and lists' },
    { id: 'compact', label: 'Compact', desc: 'Slimmer rows to display more conversations' },
  ];

  const BUBBLE_STYLES: { id: BubbleStyle; label: string; desc: string }[] = [
    { id: 'standard', label: 'Standard', desc: 'Distinct directional corners indicating message flow' },
    { id: 'soft', label: 'Soft Pill', desc: 'Smoothly rounded contours with softened edges' },
  ];

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <section aria-labelledby="theme-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="theme-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Color Theme
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Select your visual appearance. Currently active:{' '}
          <span className="font-semibold text-wine dark:text-[#F3B3C2] capitalize">{resolvedTheme}</span>
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateAppearance({ theme: item.id })}
                className={cn(
                  'group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200 ease-out active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
                  isSelected
                    ? 'border-wine bg-wine/[0.04] dark:bg-wine/15 shadow-sm ring-1 ring-wine/30'
                    : 'border-stone dark:border-white/10 bg-white dark:bg-[#1A1418] hover:border-stone-strong dark:hover:border-white/20 hover:bg-porcelain/60 dark:hover:bg-white/[0.03]'
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                        isSelected
                          ? 'bg-wine text-white'
                          : 'bg-porcelain dark:bg-white/10 text-muted group-hover:text-charcoal dark:group-hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {isSelected ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-wine text-white shadow-xs">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="h-5 w-5 rounded-full border border-stone-subtle dark:border-white/15 group-hover:border-wine/50" />
                  )}
                </div>

                {/* 4-Chip Miniature Palette Preview Bar */}
                <div className="mt-3 flex items-center gap-1.5 w-full">
                  <div
                    className="h-3.5 flex-1 rounded-sm border border-black/10 dark:border-white/10 shadow-2xs"
                    style={{ backgroundColor: item.palette.bg }}
                    title="Canvas Base"
                  />
                  <div
                    className="h-3.5 flex-1 rounded-sm border border-black/10 dark:border-white/10 shadow-2xs"
                    style={{ backgroundColor: item.palette.surface }}
                    title="Surface Card"
                  />
                  <div
                    className="h-3.5 flex-1 rounded-sm border border-black/10 dark:border-white/10 shadow-2xs"
                    style={{ backgroundColor: item.palette.border }}
                    title="Hairline Border"
                  />
                  <div
                    className="h-3.5 flex-1 rounded-sm border border-black/10 dark:border-white/10 shadow-2xs"
                    style={{ backgroundColor: item.palette.accent }}
                    title="Wine Accent"
                  />
                </div>

                <span className="mt-3 text-[13.5px] font-bold text-charcoal dark:text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 text-xs text-muted dark:text-muted-foreground leading-relaxed">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Live Preview Card */}
      <section aria-labelledby="preview-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="preview-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Live Chat Preview
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Instantly previews your typography, bubble style, and spacing choices.
            </p>
          </div>
          <span className="rounded-full border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#251D22] px-3 py-1 text-[11px] font-semibold text-wine dark:text-[#F3B3C2]">
            Interactive
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#1A1418] p-5">
          <div className="space-y-3">
            {/* Incoming bubble */}
            <div className="flex justify-start">
              <div
                className={cn(
                  'max-w-[80%] px-4 py-2.5 shadow-sm transition-[border-radius,background-color,color,border-color] duration-180 ease-out',
                  bubbleStyle === 'soft' ? 'rounded-[20px_20px_20px_6px]' : 'rounded-[16px_16px_16px_4px]'
                )}
                style={{
                  backgroundColor: 'var(--bubble-other-bg)',
                  color: 'var(--bubble-other-text)',
                  border: '1px solid var(--bubble-other-border)',
                }}
              >
                <p className="chat-bubble-text text-[14px] leading-relaxed">
                  Hello! How does the typography and bubble style feel?
                </p>
                <span className="mt-1 block text-right text-[10.5px] text-muted dark:text-muted-foreground">10:42 AM</span>
              </div>
            </div>

            {/* Outgoing bubble */}
            <div className="flex justify-end">
              <div
                className={cn(
                  'max-w-[80%] px-4 py-2.5 shadow-sm transition-[border-radius,background-color,color,border-color] duration-180 ease-out',
                  bubbleStyle === 'soft' ? 'rounded-[20px_20px_6px_20px]' : 'rounded-[16px_16px_4px_16px]'
                )}
                style={{
                  backgroundColor: 'var(--bubble-own-bg)',
                  color: 'var(--bubble-own-text)',
                }}
              >
                <p className="chat-bubble-text text-[14px] leading-relaxed">
                  The Wine & Porcelain aesthetic is clear and readable.
                </p>
                <span className="mt-1 block text-right text-[10.5px] text-white/75">10:43 AM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Typography & Sizing */}
      <section aria-labelledby="typography-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="typography-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Message Text Size
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Adjust the reading size of incoming and outgoing chat bubbles.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {TEXT_SIZES.map((size) => {
            const isSelected = messageTextSize === size.id;
            return (
              <button
                key={size.id}
                type="button"
                onClick={() => updateAppearance({ messageTextSize: size.id })}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border py-3 text-center transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
                  isSelected
                    ? 'border-wine bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2] font-semibold shadow-sm'
                    : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] text-charcoal dark:text-foreground hover:bg-porcelain dark:hover:bg-[#2F242B]'
                )}
              >
                <span className="text-xs font-semibold">{size.label}</span>
                <span className="mt-0.5 text-[11px] text-muted dark:text-muted-foreground">{size.px}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Message Spacing */}
      <section aria-labelledby="spacing-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="spacing-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Message Spacing
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Controls the vertical space between consecutive messages in conversation feeds.
        </p>

        <div className="mt-4 space-y-2">
          {SPACINGS.map((item) => {
            const isSelected = messageSpacing === item.id;
            return (
              <label
                key={item.id}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.99]',
                  isSelected
                    ? 'border-wine bg-wine/5 dark:bg-wine/20'
                    : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] hover:bg-porcelain/60 dark:hover:bg-[#2F242B]'
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-charcoal dark:text-foreground">
                    {item.label}
                  </span>
                  <span className="text-xs text-muted dark:text-muted-foreground">
                    {item.desc}
                  </span>
                </div>
                <input
                  type="radio"
                  name="messageSpacing"
                  value={item.id}
                  checked={isSelected}
                  onChange={() => updateAppearance({ messageSpacing: item.id })}
                  className="h-4 w-4 accent-wine focus:ring-wine"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* Chat Density & Bubble Style */}
      <section aria-labelledby="density-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="density-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Interface Density & Bubble Style
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Refine the compactness and silhouette of the conversation layout.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground">
              Conversation List Density
            </span>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DENSITIES.map((d) => {
                const isSelected = chatDensity === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => updateAppearance({ chatDensity: d.id })}
                    className={cn(
                      'flex flex-col items-start rounded-xl border p-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
                      isSelected
                        ? 'border-wine bg-wine/5 dark:bg-wine/20 shadow-sm'
                        : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] hover:bg-porcelain/60 dark:hover:bg-[#2F242B]'
                    )}
                  >
                    <span className="text-sm font-semibold text-charcoal dark:text-foreground">{d.label}</span>
                    <span className="mt-1 text-xs text-muted dark:text-muted-foreground leading-relaxed">{d.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-stone-subtle dark:border-[#382832] pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground">
              Bubble Silhouette
            </span>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BUBBLE_STYLES.map((b) => {
                const isSelected = bubbleStyle === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => updateAppearance({ bubbleStyle: b.id })}
                    className={cn(
                      'flex flex-col items-start rounded-xl border p-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine',
                      isSelected
                        ? 'border-wine bg-wine/5 dark:bg-wine/20 shadow-sm'
                        : 'border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] hover:bg-porcelain/60 dark:hover:bg-[#2F242B]'
                    )}
                  >
                    <span className="text-sm font-semibold text-charcoal dark:text-foreground">{b.label}</span>
                    <span className="mt-1 text-xs text-muted dark:text-muted-foreground leading-relaxed">{b.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

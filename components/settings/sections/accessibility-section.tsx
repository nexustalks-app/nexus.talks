'use client';

import React from 'react';
import {
  Type,
  Contrast,
  ZapOff,
  Focus,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import { Switch } from '@/components/ui/switch';

export function AccessibilitySection() {
  const { settings, updateAccessibility } = useSettings();
  const {
    largerText,
    highContrast,
    reduceMotion,
    disableAnimations,
    enhancedFocus,
  } = settings.accessibility;

  return (
    <div className="space-y-8">
      {/* Visual & Typography Accessibility */}
      <section aria-labelledby="visual-a11y-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="visual-a11y-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Vision & Reading Aids
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Features designed to enhance clarity, legibility, and contrast throughout the application.
        </p>

        <div className="mt-5 divide-y divide-stone-subtle dark:divide-[#382832]/60">
          {/* Larger Interface Text */}
          <div className="flex items-center justify-between py-4 first:pt-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Type className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="large-text-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Larger Interface Typography
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Scales the base interface typography up for enhanced legibility across all pages, navigation, and controls.
                </p>
              </div>
            </div>
            <Switch
              id="large-text-toggle"
              checked={largerText}
              onCheckedChange={(val) => updateAccessibility({ largerText: val })}
              aria-label="Larger interface typography"
            />
          </div>

          {/* High Contrast Mode */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Contrast className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="high-contrast-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  High-Contrast Outlines & Borders
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Deepens contrast ratios for borders, text fields, cards, and interactive boundaries.
                </p>
              </div>
            </div>
            <Switch
              id="high-contrast-toggle"
              checked={highContrast}
              onCheckedChange={(val) => updateAccessibility({ highContrast: val })}
              aria-label="High-contrast outlines and borders"
            />
          </div>

          {/* Enhanced Focus Rings */}
          <div className="flex items-center justify-between py-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Focus className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="enhanced-focus-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  High-Visibility Focus Rings
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Highlights keyboard-focused interactive elements with high-visibility wine outlines.
                </p>
              </div>
            </div>
            <Switch
              id="enhanced-focus-toggle"
              checked={enhancedFocus}
              onCheckedChange={(val) => updateAccessibility({ enhancedFocus: val })}
              aria-label="High-visibility focus rings"
            />
          </div>
        </div>
      </section>

      {/* Motion & Interaction */}
      <section aria-labelledby="motion-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="motion-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Motion & Animations
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Reduce or suppress animated transitions to reduce disorientation or vestibular discomfort.
        </p>

        <div className="mt-5 divide-y divide-stone-subtle dark:divide-[#382832]/60">
          {/* Reduce Motion */}
          <div className="flex items-center justify-between py-4 first:pt-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <ZapOff className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="reduce-motion-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Reduce Motion
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Suppresses slide, scale, and decorative motion. Automatically honors your system preference by default.
                </p>
              </div>
            </div>
            <Switch
              id="reduce-motion-toggle"
              checked={reduceMotion}
              onCheckedChange={(val) => updateAccessibility({ reduceMotion: val })}
              aria-label="Reduce motion"
            />
          </div>

          {/* Disable Nonessential Animations */}
          <div className="flex items-center justify-between py-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain dark:bg-[#251D22] text-muted dark:text-muted-foreground">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="disable-anim-toggle" className="text-sm font-semibold text-charcoal dark:text-foreground cursor-pointer">
                  Disable Nonessential Animations
                </label>
                <p className="text-xs text-muted dark:text-muted-foreground">
                  Eliminates modal transitions, pulsing skeletons, and hover animations for an immediate, static response.
                </p>
              </div>
            </div>
            <Switch
              id="disable-anim-toggle"
              checked={disableAnimations}
              onCheckedChange={(val) => updateAccessibility({ disableAnimations: val })}
              aria-label="Disable nonessential animations"
            />
          </div>
        </div>
      </section>

      {/* Standards & Compliance Card */}
      <section aria-labelledby="compliance-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-porcelain/60 dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 id="compliance-heading" className="text-sm font-bold text-charcoal dark:text-foreground">
              Inclusive Design Guarantees
            </h2>
            <ul className="mt-2 space-y-1.5 text-xs text-muted dark:text-muted-foreground leading-relaxed">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span><strong>No color alone:</strong> Unread messages, active states, and errors always include text labels, count badges, or distinct geometric indicators.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span><strong>Screen reader friendly:</strong> Icon-only buttons provide semantic aria-labels and status announcements.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span><strong>Touch target compliance:</strong> Interactive mobile controls meet or exceed 44×44px touch targets.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

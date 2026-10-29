import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { CommandProvider } from "@/lib/command/command-context";
import { CommandPalette } from "@/components/command/command-palette";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus.talks — Modern Realtime Messaging",
  description: "Fast, private, and beautifully crafted messaging for modern teams.",
  icons: {
    icon: "/icon.svg",
  },
};

const themeBootstrapScript = `
  (function() {
    try {
      var raw = localStorage.getItem('nx_settings');
      var theme = 'light';
      var largerText = false;
      var highContrast = false;
      var reduceMotion = false;
      var disableAnim = false;
      var enhancedFocus = false;
      var chatSize = 'medium';
      var chatSpacing = 'comfortable';
      var chatDensity = 'comfortable';
      var bubbleStyle = 'standard';

      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed.appearance) {
          if (parsed.appearance.theme) theme = parsed.appearance.theme;
          if (parsed.appearance.messageTextSize) chatSize = parsed.appearance.messageTextSize;
          if (parsed.appearance.messageSpacing) chatSpacing = parsed.appearance.messageSpacing;
          if (parsed.appearance.chatDensity) chatDensity = parsed.appearance.chatDensity;
          if (parsed.appearance.bubbleStyle) bubbleStyle = parsed.appearance.bubbleStyle;
        }
        if (parsed.accessibility) {
          if (parsed.accessibility.largerText) largerText = true;
          if (parsed.accessibility.highContrast) highContrast = true;
          if (parsed.accessibility.reduceMotion) reduceMotion = true;
          if (parsed.accessibility.disableAnimations) disableAnim = true;
          if (parsed.accessibility.enhancedFocus) enhancedFocus = true;
        }
      } else {
        var explicitUserTheme = localStorage.getItem('nexus_user_theme');
        if (explicitUserTheme && (explicitUserTheme === 'dark' || explicitUserTheme === 'midnight-wine' || explicitUserTheme === 'arctic-porcelain' || explicitUserTheme === 'graphite' || explicitUserTheme === 'system')) {
          theme = explicitUserTheme;
        } else {
          theme = 'light';
        }
      }

      var resolved = theme === 'system'
        ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

      var isDark = resolved === 'dark' || resolved === 'midnight-wine' || resolved === 'graphite';
      var root = document.documentElement;

      root.setAttribute('data-theme', resolved);
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');

      root.setAttribute('data-chat-size', chatSize);
      root.setAttribute('data-chat-spacing', chatSpacing);
      root.setAttribute('data-chat-density', chatDensity);
      root.setAttribute('data-bubble-style', bubbleStyle);

      if (largerText) root.classList.add('nx-large-text');
      if (highContrast) root.classList.add('nx-high-contrast');
      if (reduceMotion) root.classList.add('nx-reduce-motion');
      if (disableAnim) root.classList.add('nx-disable-anim');
      if (enhancedFocus) root.classList.add('nx-focus-visible');

      // Unregister any stale legacy service workers that may cache obsolete chunks
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          for (var i = 0; i < regs.length; i++) {
            regs[i].unregister();
          }
        }).catch(function() {});
      }

      // Clean up cache-busting _v query parameter cleanly from address bar
      if (window.location && window.location.search && window.location.search.indexOf('_v=') !== -1) {
        try {
          var u = new URL(window.location.href);
          u.searchParams.delete('_v');
          var clean = u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash;
          window.history.replaceState(null, '', clean);
        } catch(e) {}
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${plusJakarta.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="bg-porcelain text-charcoal font-sans antialiased">
        <SettingsProvider>
          <CommandProvider>
            {children}
            <CommandPalette />
          </CommandProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

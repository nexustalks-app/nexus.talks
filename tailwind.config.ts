import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nexus.talks Modern 2026 Wine & Porcelain Tokens
        wine: {
          DEFAULT: "#582030", // Deep Wine (saturated, luxurious)
          hover: "#702A3E",   // Rich Burgundy
          dark: "#1E1217",    // Obsidian Dark Wine
          elevated: "#2C1B22",// Elevated Dark
          soft: "rgba(88, 32, 48, 0.08)",
          subtle: "rgba(88, 32, 48, 0.14)",
        },
        burgundy: {
          DEFAULT: "#702A3E", // Rich Burgundy
          hover: "#582030",
          light: "#86334B",
          soft: "rgba(112, 42, 62, 0.10)",
        },
        rose: {
          DEFAULT: "#A77982", // Muted Rose
          soft: "rgba(167, 121, 130, 0.12)",
        },
        porcelain: {
          DEFAULT: "#F9F8F6", // Luminous, crisp porcelain background
          alt: "#F2EFEB",
          surface: "#FAF8F6",
        },
        white: "#FFFFFF",
        stone: {
          DEFAULT: "#E5E0DC", // Crisp architectural hairline border
          subtle: "#ECE8E5",
          strong: "#D4CDC7",
        },
        charcoal: {
          DEFAULT: "#161315", // Crisp primary Obsidian-Charcoal text
          dark: "#0F0C0E",
        },
        muted: {
          DEFAULT: "#575054", // High-contrast readable secondary text
          faint: "#7C7479",
          ghost: "#A89FA4",
        },
        // Semantic variable mappings
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          '"Playfair Display"',
          '"Cormorant Garamond"',
          "Didot",
          '"Bodoni MT"',
          "Georgia",
          '"Times New Roman"',
          "serif",
        ],
        display: [
          "var(--font-serif)",
          '"Playfair Display"',
          '"Cormorant Garamond"',
          "Didot",
          "Georgia",
          "serif",
        ],
      },
      borderRadius: {
        "xl": "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translate3d(0, 16px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "fade-down": {
          "0%": { opacity: "0", transform: "translate3d(0, -12px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "fade-scale": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "ambient-float": {
          "0%, 100%": { transform: "scale(1.02) translate3d(0, 0, 0)" },
          "50%": { transform: "scale(1.045) translate3d(0, -5px, 0)" },
        },
        "typing-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translate3d(0, 4px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "message-enter": {
          "0%": { opacity: "0", transform: "translate3d(0, 6px, 0) scale(0.985)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(1)" },
        },
        "stage-enter": {
          "0%": { opacity: "0", transform: "translate3d(0, 4px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "dialog-enter": {
          "0%": { opacity: "0", transform: "translate3d(0, 8px, 0) scale(0.98)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(1)" },
        },
        "backdrop-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "popover-enter": {
          "0%": { opacity: "0", transform: "translate3d(0, -4px, 0) scale(0.98)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "fade-up": "fade-up 450ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-down": "fade-down 350ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-scale": "fade-scale 250ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "ambient-float": "ambient-float 16s ease-in-out infinite",
        "typing-dot": "typing-dot 1.2s infinite ease-in-out",
        "slide-up": "slide-up 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "message-enter": "message-enter 150ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "stage-enter": "stage-enter 140ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "dialog-enter": "dialog-enter 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "backdrop-fade": "backdrop-fade 160ms ease-out both",
        "popover-enter": "popover-enter 130ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.16, 1, 0.3, 1)",
        "smooth": "cubic-bezier(0.2, 0, 0, 1)",
      },
      boxShadow: {
        "sm": "0 1px 2px 0 rgba(41, 38, 40, 0.04)",
        "md": "0 4px 16px -2px rgba(41, 38, 40, 0.08), 0 2px 6px -1px rgba(41, 38, 40, 0.04)",
        "lg": "0 12px 32px -4px rgba(41, 38, 40, 0.12), 0 4px 12px -2px rgba(41, 38, 40, 0.06)",
        "card": "0 1px 3px 0 rgba(41, 38, 40, 0.05), 0 1px 2px -1px rgba(41, 38, 40, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;

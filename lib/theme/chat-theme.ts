/**
 * Personal Chat Theme Tokens & Configuration
 * Nexus.talks — Conversation Experience 2.0
 *
 * Scoped per-conversation customization tokens for both Light and Dark application themes.
 */

export type BuiltInThemeId =
  | 'default'
  | 'porcelain'
  | 'midnight'
  | 'burgundy'
  | 'soft-stone'
  | 'olive-editorial'
  | 'rosewood';

export type BackgroundPatternId =
  | 'default'
  | 'plain'
  | 'soft-stone'
  | 'charcoal'
  | 'geometric';

export interface ThemeColors {
  canvasBg: string;
  canvasPattern?: string;
  outgoingBg: string;
  outgoingText: string;
  outgoingBorder: string;
  outgoingShadow: string;
  incomingBg: string;
  incomingText: string;
  incomingBorder: string;
  incomingShadow: string;
  accent: string;
  metaText: string;
}

export interface ChatThemeDefinition {
  id: BuiltInThemeId;
  name: string;
  description: string;
  swatch: {
    primary: string;
    secondary: string;
    surface: string;
  };
  light: ThemeColors;
  dark: ThemeColors;
}

export interface ConversationThemePreference {
  themeId: BuiltInThemeId;
  backgroundId: BackgroundPatternId;
  updatedAt?: string;
}

export const DEFAULT_THEME_PREFERENCE: ConversationThemePreference = {
  themeId: 'default',
  backgroundId: 'default',
};

// Subtle geometric dot lattice SVG pattern
const GEOMETRIC_PATTERN_LIGHT = `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1.2' fill='%236B263B' fill-opacity='0.08'/%3E%3C/svg%3E")`;
const GEOMETRIC_PATTERN_DARK = `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1.2' fill='%23F3B3C2' fill-opacity='0.08'/%3E%3C/svg%3E")`;

export const BACKGROUND_OPTIONS: {
  id: BackgroundPatternId;
  name: string;
  description: string;
  lightPattern: string;
  darkPattern: string;
}[] = [
  {
    id: 'default',
    name: 'Nexus Constellation',
    description: 'Signature celestial motifs and constellation linework',
    lightPattern: 'var(--canvas-pattern)',
    darkPattern: 'var(--canvas-pattern)',
  },
  {
    id: 'plain',
    name: 'Plain Canvas',
    description: 'Clean solid surface without pattern overlays',
    lightPattern: 'none',
    darkPattern: 'none',
  },
  {
    id: 'geometric',
    name: 'Subtle Lattice',
    description: 'Minimal dot-grid geometric resonance pattern',
    lightPattern: GEOMETRIC_PATTERN_LIGHT,
    darkPattern: GEOMETRIC_PATTERN_DARK,
  },
  {
    id: 'soft-stone',
    name: 'Soft Stone',
    description: 'Quiet warm-grey stippled architectural surface',
    lightPattern: 'none',
    darkPattern: 'none',
  },
  {
    id: 'charcoal',
    name: 'Deep Charcoal',
    description: 'Quiet matte slate surface with muted contrast',
    lightPattern: 'none',
    darkPattern: 'none',
  },
];

export const BUILT_IN_CHAT_THEMES: Record<BuiltInThemeId, ChatThemeDefinition> = {
  default: {
    id: 'default',
    name: 'Nexus Classic',
    description: 'Signature deep wine with tactile ivory porcelain surfaces',
    swatch: {
      primary: '#78263F',
      secondary: '#631D35',
      surface: '#FAF7F9',
    },
    light: {
      canvasBg: 'var(--pane-chat-bg, #FAF7F9)',
      outgoingBg: 'linear-gradient(135deg, #78263F 0%, #631D35 55%, #4C1425 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.22)',
      outgoingShadow: '0 4px 18px -2px rgba(99, 29, 53, 0.32), inset 0 1px 0.5px rgba(255, 255, 255, 0.35)',
      incomingBg: 'var(--message-incoming-bg, #FFFFFF)',
      incomingText: 'var(--message-incoming-text, #1E161B)',
      incomingBorder: 'var(--message-incoming-border, rgba(0, 0, 0, 0.08))',
      incomingShadow: '0 2px 10px -2px rgba(35, 15, 22, 0.06)',
      accent: '#7A223B',
      metaText: '#7B7378',
    },
    dark: {
      canvasBg: 'var(--pane-chat-bg, #140E13)',
      outgoingBg: 'linear-gradient(135deg, #78263F 0%, #631D35 55%, #4C1425 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.20)',
      outgoingShadow: '0 4px 18px -2px rgba(0, 0, 0, 0.50), inset 0 1px 0.5px rgba(255, 255, 255, 0.25)',
      incomingBg: 'var(--message-incoming-bg, #20171E)',
      incomingText: 'var(--message-incoming-text, #EDE8EC)',
      incomingBorder: 'var(--message-incoming-border, rgba(255, 255, 255, 0.08))',
      incomingShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.40)',
      accent: '#F3B3C2',
      metaText: '#9E969B',
    },
  },

  porcelain: {
    id: 'porcelain',
    name: 'Porcelain Ivory',
    description: 'Warm ivory surfaces with restrained wine accents and high legibility',
    swatch: {
      primary: '#852A42',
      secondary: '#A84C64',
      surface: '#FDFBF7',
    },
    light: {
      canvasBg: '#FAF8F4',
      outgoingBg: 'linear-gradient(135deg, #7A223B 0%, #5E192B 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.25)',
      outgoingShadow: '0 4px 16px -2px rgba(99, 29, 53, 0.25)',
      incomingBg: '#FFFFFF',
      incomingText: '#231B1E',
      incomingBorder: 'rgba(122, 34, 59, 0.12)',
      incomingShadow: '0 2px 8px -2px rgba(40, 20, 25, 0.05)',
      accent: '#7A223B',
      metaText: '#7C7276',
    },
    dark: {
      canvasBg: '#181216',
      outgoingBg: 'linear-gradient(135deg, #8A2B45 0%, #681C31 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.18)',
      outgoingShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.45)',
      incomingBg: '#251C22',
      incomingText: '#FAF6F8',
      incomingBorder: 'rgba(255, 255, 255, 0.09)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.35)',
      accent: '#F0B6C4',
      metaText: '#A89FA4',
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight Enamel',
    description: 'Velvet charcoal surfaces with comfortable luminous rose accents',
    swatch: {
      primary: '#431725',
      secondary: '#2C101A',
      surface: '#151014',
    },
    light: {
      canvasBg: '#F3EFF2',
      outgoingBg: 'linear-gradient(135deg, #4A1626 0%, #350D1A 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.18)',
      outgoingShadow: '0 4px 16px -2px rgba(53, 13, 26, 0.30)',
      incomingBg: '#FFFFFF',
      incomingText: '#1C1518',
      incomingBorder: 'rgba(53, 13, 26, 0.14)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
      accent: '#5E1B31',
      metaText: '#746B70',
    },
    dark: {
      canvasBg: '#0F0B0E',
      outgoingBg: 'linear-gradient(135deg, #5C1D30 0%, #3E101E 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(243, 179, 194, 0.25)',
      outgoingShadow: '0 4px 18px -2px rgba(0, 0, 0, 0.60)',
      incomingBg: '#1C141A',
      incomingText: '#F5EFF3',
      incomingBorder: 'rgba(255, 255, 255, 0.07)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.50)',
      accent: '#F3B3C2',
      metaText: '#9A9096',
    },
  },

  burgundy: {
    id: 'burgundy',
    name: 'Imperial Burgundy',
    description: 'Deep royal burgundy tones paired with warm antique rose notes',
    swatch: {
      primary: '#8A1C38',
      secondary: '#641227',
      surface: '#FCF5F7',
    },
    light: {
      canvasBg: '#FAF3F5',
      outgoingBg: 'linear-gradient(135deg, #8E1C3A 0%, #681128 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.25)',
      outgoingShadow: '0 4px 18px -2px rgba(110, 17, 40, 0.35)',
      incomingBg: '#FFFFFF',
      incomingText: '#26161C',
      incomingBorder: 'rgba(142, 28, 58, 0.15)',
      incomingShadow: '0 2px 8px -2px rgba(110, 17, 40, 0.07)',
      accent: '#8E1C3A',
      metaText: '#7D6D73',
    },
    dark: {
      canvasBg: '#150A0E',
      outgoingBg: 'linear-gradient(135deg, #9C2042 0%, #75142E 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.22)',
      outgoingShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.60)',
      incomingBg: '#231219',
      incomingText: '#FCEEF2',
      incomingBorder: 'rgba(156, 32, 66, 0.25)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.45)',
      accent: '#FCA5BD',
      metaText: '#A8959C',
    },
  },

  'soft-stone': {
    id: 'soft-stone',
    name: 'Soft Stone',
    description: 'Quiet warm-grey surfaces with understated, calm architectural contrast',
    swatch: {
      primary: '#5B4B52',
      secondary: '#43373D',
      surface: '#F4F3F1',
    },
    light: {
      canvasBg: '#F3F2EF',
      outgoingBg: 'linear-gradient(135deg, #5C444F 0%, #44313B 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.20)',
      outgoingShadow: '0 4px 14px -2px rgba(68, 49, 59, 0.25)',
      incomingBg: '#FFFFFF',
      incomingText: '#221F21',
      incomingBorder: 'rgba(0, 0, 0, 0.08)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
      accent: '#6B4D5B',
      metaText: '#767073',
    },
    dark: {
      canvasBg: '#141416',
      outgoingBg: 'linear-gradient(135deg, #6C525F 0%, #4E3944 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.16)',
      outgoingShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.50)',
      incomingBg: '#202023',
      incomingText: '#EDECEE',
      incomingBorder: 'rgba(255, 255, 255, 0.08)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.40)',
      accent: '#D4B8C5',
      metaText: '#9E9A9D',
    },
  },

  'olive-editorial': {
    id: 'olive-editorial',
    name: 'Olive Editorial',
    description: 'Muted olive and parchment notes evoking curated print monographs',
    swatch: {
      primary: '#47533E',
      secondary: '#333D2D',
      surface: '#F8F7F2',
    },
    light: {
      canvasBg: '#F7F6F0',
      outgoingBg: 'linear-gradient(135deg, #48553F 0%, #343E2D 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.20)',
      outgoingShadow: '0 4px 14px -2px rgba(52, 62, 45, 0.25)',
      incomingBg: '#FFFFFF',
      incomingText: '#1E211B',
      incomingBorder: 'rgba(72, 85, 63, 0.14)',
      incomingShadow: '0 2px 8px -2px rgba(52, 62, 45, 0.05)',
      accent: '#48553F',
      metaText: '#6F746A',
    },
    dark: {
      canvasBg: '#121411',
      outgoingBg: 'linear-gradient(135deg, #526148 0%, #3B4633 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.16)',
      outgoingShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.50)',
      incomingBg: '#1C201A',
      incomingText: '#EFF2EC',
      incomingBorder: 'rgba(82, 97, 72, 0.22)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.40)',
      accent: '#B0C2A5',
      metaText: '#9AA095',
    },
  },

  rosewood: {
    id: 'rosewood',
    name: 'Dusty Rosewood',
    description: 'Subtle antique rose and mahogany details with gentle tonal depth',
    swatch: {
      primary: '#773549',
      secondary: '#582333',
      surface: '#FAF4F6',
    },
    light: {
      canvasBg: '#F9F3F5',
      outgoingBg: 'linear-gradient(135deg, #7A354A 0%, #592233 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.22)',
      outgoingShadow: '0 4px 16px -2px rgba(89, 34, 51, 0.28)',
      incomingBg: '#FFFFFF',
      incomingText: '#22191D',
      incomingBorder: 'rgba(122, 53, 74, 0.14)',
      incomingShadow: '0 2px 8px -2px rgba(89, 34, 51, 0.05)',
      accent: '#7A354A',
      metaText: '#7A6D72',
    },
    dark: {
      canvasBg: '#140D11',
      outgoingBg: 'linear-gradient(135deg, #8E3E56 0%, #68293C 100%)',
      outgoingText: '#FFFFFF',
      outgoingBorder: 'rgba(255, 255, 255, 0.18)',
      outgoingShadow: '0 4px 18px -2px rgba(0, 0, 0, 0.55)',
      incomingBg: '#21151B',
      incomingText: '#FAF2F5',
      incomingBorder: 'rgba(142, 62, 86, 0.24)',
      incomingShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.45)',
      accent: '#EFA4B8',
      metaText: '#A4959B',
    },
  },
};

/**
 * Storage helpers for user-scoped or demo-scoped chat theme persistence
 */
export function getChatThemeStorageKey(conversationId: string, userId?: string | null, isDemo: boolean = false): string {
  if (isDemo) {
    return `nx_demo_chat_theme_${conversationId}`;
  }
  return userId ? `nx_chat_theme_${userId}_${conversationId}` : `nx_chat_theme_${conversationId}`;
}

export function loadChatThemePreference(
  conversationId: string,
  userId?: string | null,
  isDemo: boolean = false
): ConversationThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME_PREFERENCE;
  try {
    const key = getChatThemeStorageKey(conversationId, userId, isDemo);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_THEME_PREFERENCE;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.themeId === 'string' && BUILT_IN_CHAT_THEMES[parsed.themeId as BuiltInThemeId]) {
      return {
        themeId: parsed.themeId as BuiltInThemeId,
        backgroundId: (parsed.backgroundId as BackgroundPatternId) || 'default',
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    /* fallback to default */
  }
  return DEFAULT_THEME_PREFERENCE;
}

export function saveChatThemePreference(
  conversationId: string,
  preference: ConversationThemePreference,
  userId?: string | null,
  isDemo: boolean = false
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getChatThemeStorageKey(conversationId, userId, isDemo);
    localStorage.setItem(
      key,
      JSON.stringify({
        ...preference,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* ignore storage errors */
  }
}

export function removeChatThemePreference(
  conversationId: string,
  userId?: string | null,
  isDemo: boolean = false
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getChatThemeStorageKey(conversationId, userId, isDemo);
    localStorage.removeItem(key);
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Generates scoped CSS variable styles for a given theme, background, and dark mode state
 */
export function getChatThemeStyles(
  preference: ConversationThemePreference,
  isDark: boolean
): React.CSSProperties {
  const theme = BUILT_IN_CHAT_THEMES[preference.themeId] || BUILT_IN_CHAT_THEMES.default;
  const colors = isDark ? theme.dark : theme.light;
  const bgOpt = BACKGROUND_OPTIONS.find((b) => b.id === preference.backgroundId) || BACKGROUND_OPTIONS[0];
  const pattern = isDark ? bgOpt.darkPattern : bgOpt.lightPattern;

  return {
    ['--pane-chat-bg' as string]: colors.canvasBg,
    ['--canvas-pattern' as string]: pattern,
    ['--chat-outgoing-bg' as string]: colors.outgoingBg,
    ['--chat-outgoing-text' as string]: colors.outgoingText,
    ['--chat-outgoing-border' as string]: colors.outgoingBorder,
    ['--chat-outgoing-shadow' as string]: colors.outgoingShadow,
    ['--chat-incoming-bg' as string]: colors.incomingBg,
    ['--chat-incoming-text' as string]: colors.incomingText,
    ['--chat-incoming-border' as string]: colors.incomingBorder,
    ['--chat-incoming-shadow' as string]: colors.incomingShadow,
    ['--chat-theme-accent' as string]: colors.accent,
    ['--chat-theme-meta' as string]: colors.metaText,
  };
}

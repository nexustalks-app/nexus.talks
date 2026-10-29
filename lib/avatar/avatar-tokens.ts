/**
 * Nexus.talks — Avatar System Design Tokens & Palettes
 *
 * Provides executive, restrained luxury palettes adhering strictly to the
 * Wine & Porcelain identity: deep imperial wine, burgundy, smoked graphite,
 * plum, terracotta, cypress olive, bronze, slate, and espresso.
 *
 * Strict Guarantees:
 * 1. Palette Index 0 is exclusively reserved for Mr Aasif (the Creator).
 * 2. All other users and contacts are mapped deterministically to indices 1 through 10.
 * 3. 100% deterministic between server-side rendering and client hydration.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const AVATAR_SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
  '2xl': 'h-24 w-24',
};

export interface LuxuryPalette {
  name: string;
  gradient: [string, string];
  rim: string;
  innerRing: string;
  textColor: string;
  accent: string;
}

/**
 * Mature, executive Wine & Porcelain luxury palettes.
 * Rich, dimensional jewel-tones with exquisite tactile contrast.
 */
export const LUXURY_PALETTES: LuxuryPalette[] = [
  // 0. Imperial Wine & Royal Gold (Exclusively reserved for Mr Aasif, Creator)
  {
    name: 'Imperial Wine',
    gradient: ['#7A1F35', '#3A0E18'],
    rim: 'rgba(229, 184, 105, 0.75)',
    innerRing: 'rgba(229, 184, 105, 0.45)',
    textColor: '#FFF9EE',
    accent: '#E5B869',
  },
  // 1. Burgundy Rose (Elena)
  {
    name: 'Burgundy Rose',
    gradient: ['#8C2B45', '#481221'],
    rim: 'rgba(243, 179, 194, 0.50)',
    innerRing: 'rgba(255, 255, 255, 0.25)',
    textColor: '#FFF5F8',
    accent: '#F3B3C2',
  },
  // 2. Smoked Graphite (Marcus)
  {
    name: 'Smoked Graphite',
    gradient: ['#434654', '#1E2028'],
    rim: 'rgba(202, 208, 222, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.22)',
    textColor: '#F7F8FA',
    accent: '#CAD0DE',
  },
  // 3. Dusky Plum (Sophia)
  {
    name: 'Dusky Plum',
    gradient: ['#792B5E', '#3D132E'],
    rim: 'rgba(235, 180, 210, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.25)',
    textColor: '#FCF4FA',
    accent: '#EBB4D2',
  },
  // 4. Warm Terracotta (Julian)
  {
    name: 'Warm Terracotta',
    gradient: ['#9A422B', '#4E1D11'],
    rim: 'rgba(245, 184, 167, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.25)',
    textColor: '#FFF7F2',
    accent: '#F5B8A7',
  },
  // 5. Deep Cypress (Amara / Nexus.talks)
  {
    name: 'Deep Cypress',
    gradient: ['#245E47', '#123326'],
    rim: 'rgba(165, 201, 180, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.25)',
    textColor: '#F2FAF6',
    accent: '#A5C9B4',
  },
  // 6. Burnished Bronze (Kaeleen)
  {
    name: 'Burnished Bronze',
    gradient: ['#875628', '#462B12'],
    rim: 'rgba(232, 198, 142, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.25)',
    textColor: '#FFFBF4',
    accent: '#E8CA9B',
  },
  // 7. Midnight Slate (Lapis)
  {
    name: 'Midnight Slate',
    gradient: ['#2E4A6F', '#152438'],
    rim: 'rgba(173, 200, 232, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.22)',
    textColor: '#F4F8FD',
    accent: '#ADC8E8',
  },
  // 8. Smoked Espresso (Mocha)
  {
    name: 'Smoked Espresso',
    gradient: ['#6B483D', '#36211B'],
    rim: 'rgba(217, 189, 182, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.22)',
    textColor: '#FAF5F2',
    accent: '#D9BDB6',
  },
  // 9. Dusky Mulberry
  {
    name: 'Dusky Mulberry',
    gradient: ['#6B2A56', '#35122A'],
    rim: 'rgba(228, 168, 211, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.25)',
    textColor: '#FDF3FA',
    accent: '#E4A8D3',
  },
  // 10. Deep Mineral Teal (Aegean)
  {
    name: 'Mineral Teal',
    gradient: ['#23606B', '#113137'],
    rim: 'rgba(157, 213, 220, 0.45)',
    innerRing: 'rgba(255, 255, 255, 0.25)',
    textColor: '#F3FAFB',
    accent: '#9DD5DC',
  },
];

/**
 * Checks whether an ID, username, or display name belongs to Mr Aasif (the Creator).
 */
export function isCreatorIdentity(seed?: string | null): boolean {
  if (!seed) return false;
  const s = seed.toLowerCase().trim();
  return (
    s === 'contact-aasif' ||
    s === 'aasif' ||
    s === 'mr aasif' ||
    s === 'mr. aasif' ||
    s.includes('the_aasif9') ||
    s.includes('aasif') ||
    s === 'creator' ||
    s === 'founder'
  );
}

/**
 * Returns a deterministic avatar palette index (0..10).
 * Index 0 is exclusively reserved for Mr Aasif (the Creator).
 * All other contacts and users are mapped deterministically to range 1..10.
 */
export function getAvatarIndex(seed?: string | null): number {
  if (!seed) return 1;
  const s = seed.toLowerCase().trim();

  // Mr Aasif strictly gets index 0 (unique Creator palette & insignia)
  if (isCreatorIdentity(s)) return 0;

  // Specific demo seeds for consistent contact identity
  if (s === 'contact-elena' || s.includes('elena') || s === 'er') return 1;
  if (s === 'contact-marcus' || s.includes('marcus') || s === 'mv') return 2;
  if (s === 'contact-sophia' || s.includes('sophia') || s === 'sl') return 3;
  if (s === 'contact-julian' || s.includes('julian') || s === 'jt') return 4;
  if (s === 'contact-amara' || s.includes('amara') || s === 'ao') return 5;
  if (s.includes('kaelen') || s === 'kv') return 6;
  if (s.includes('maya') || s === 'ml') return 7;
  if (s.includes('david') || s === 'dc') return 8;
  if (s.includes('zara') || s === 'zn') return 9;
  if (s.includes('oliver') || s === 'oh') return 10;
  if (s.includes('nia') || s === 'np') return 1;

  // General deterministic string hash for any user account or identity
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  // Guarantee index 0 is strictly never assigned to other users (range: 1..10)
  return (Math.abs(hash) % 10) + 1;
}

/**
 * Resolves a luxury palette by index, seed, or fallback.
 */
export function getAvatarPalette(indexOrSeed?: number | string | null): LuxuryPalette {
  if (typeof indexOrSeed === 'number') {
    return LUXURY_PALETTES[indexOrSeed % LUXURY_PALETTES.length] || LUXURY_PALETTES[1];
  }
  const idx = getAvatarIndex(indexOrSeed);
  return LUXURY_PALETTES[idx] || LUXURY_PALETTES[1];
}

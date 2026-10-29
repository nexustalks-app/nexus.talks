/**
 * Nexus.talks — Avatar Collection Manifest & Deterministic Mappings
 *
 * Full 25-avatar collection generated and verified in 512x512 PNG format:
 * - 13 Male characters (male-01 through male-13)
 * - 12 Female characters (female-01 through female-12)
 *
 * All files are hosted statically under /avatar-assets/<filename>.
 */

export interface AvatarItem {
  id: string;
  name: string;
  gender: 'male' | 'female';
  filename: string;
  url: string;
}

export const MALE_AVATARS: AvatarItem[] = [
  { id: 'male-01', name: 'Aasif / Founder', gender: 'male', filename: 'male-01.png', url: '/avatar-assets/male-01.png' },
  { id: 'male-02', name: 'Marcus', gender: 'male', filename: 'male-02.png', url: '/avatar-assets/male-02.png' },
  { id: 'male-03', name: 'Alexander', gender: 'male', filename: 'male-03.png', url: '/avatar-assets/male-03.png' },
  { id: 'male-04', name: 'Kaelen', gender: 'male', filename: 'male-04.png', url: '/avatar-assets/male-04.png' },
  { id: 'male-05', name: 'Devon', gender: 'male', filename: 'male-05.png', url: '/avatar-assets/male-05.png' },
  { id: 'male-06', name: 'Dorian', gender: 'male', filename: 'male-06.png', url: '/avatar-assets/male-06.png' },
  { id: 'male-07', name: 'Kieran', gender: 'male', filename: 'male-07.png', url: '/avatar-assets/male-07.png' },
  { id: 'male-08', name: 'Matteo', gender: 'male', filename: 'male-08.png', url: '/avatar-assets/male-08.png' },
  { id: 'male-09', name: 'Julian', gender: 'male', filename: 'male-09.png', url: '/avatar-assets/male-09.png' },
  { id: 'male-10', name: 'Lucian', gender: 'male', filename: 'male-10.png', url: '/avatar-assets/male-10.png' },
  { id: 'male-11', name: 'Orion', gender: 'male', filename: 'male-11.png', url: '/avatar-assets/male-11.png' },
  { id: 'male-12', name: 'Ezra', gender: 'male', filename: 'male-12.png', url: '/avatar-assets/male-12.png' },
  { id: 'male-13', name: 'Ronan', gender: 'male', filename: 'male-13.png', url: '/avatar-assets/male-13.png' },
];

export const FEMALE_AVATARS: AvatarItem[] = [
  { id: 'female-01', name: 'Elena', gender: 'female', filename: 'female-01.png', url: '/avatar-assets/female-01.png' },
  { id: 'female-02', name: 'Lyra', gender: 'female', filename: 'female-02.png', url: '/avatar-assets/female-02.png' },
  { id: 'female-03', name: 'Sophia', gender: 'female', filename: 'female-03.png', url: '/avatar-assets/female-03.png' },
  { id: 'female-04', name: 'Seraphina', gender: 'female', filename: 'female-04.png', url: '/avatar-assets/female-04.png' },
  { id: 'female-05', name: 'Amara', gender: 'female', filename: 'female-05.png', url: '/avatar-assets/female-05.png' },
  { id: 'female-06', name: 'Aurelia', gender: 'female', filename: 'female-06.png', url: '/avatar-assets/female-06.png' },
  { id: 'female-07', name: 'Mira', gender: 'female', filename: 'female-07.png', url: '/avatar-assets/female-07.png' },
  { id: 'female-08', name: 'Nadia', gender: 'female', filename: 'female-08.png', url: '/avatar-assets/female-08.png' },
  { id: 'female-09', name: 'Zoya', gender: 'female', filename: 'female-09.png', url: '/avatar-assets/female-09.png' },
  { id: 'female-10', name: 'Camilla', gender: 'female', filename: 'female-10.png', url: '/avatar-assets/female-10.png' },
  { id: 'female-11', name: 'Freya', gender: 'female', filename: 'female-11.png', url: '/avatar-assets/female-11.png' },
  { id: 'female-12', name: 'Isla', gender: 'female', filename: 'female-12.png', url: '/avatar-assets/female-12.png' },
];

export const ALL_AVATARS: AvatarItem[] = [...MALE_AVATARS, ...FEMALE_AVATARS];

/** Canonical map for core demo personas ensuring exact character consistency */
const CANONICAL_PERSONA_AVATARS: Record<string, string> = {
  // Mr Aasif (Founder & Creator)
  'contact-aasif': '/avatar-assets/male-01.png',
  'status-aasif': '/avatar-assets/male-01.png',
  'profile-aasif': '/avatar-assets/male-01.png',
  'the_aasif9': '/avatar-assets/male-01.png',
  '@the_aasif9': '/avatar-assets/male-01.png',
  'mr aasif': '/avatar-assets/male-01.png',
  'aasif': '/avatar-assets/male-01.png',

  // Elena Rostova
  'contact-elena': '/avatar-assets/female-01.png',
  'status-elena': '/avatar-assets/female-01.png',
  'profile-elena': '/avatar-assets/female-01.png',
  'elena.rostova': '/avatar-assets/female-01.png',
  '@elena.rostova': '/avatar-assets/female-01.png',
  'elena rostova': '/avatar-assets/female-01.png',
  'elena': '/avatar-assets/female-01.png',

  // Marcus Vance
  'contact-marcus': '/avatar-assets/male-02.png',
  'status-marcus': '/avatar-assets/male-02.png',
  'profile-marcus': '/avatar-assets/male-02.png',
  'marcus.vance': '/avatar-assets/male-02.png',
  '@marcus.vance': '/avatar-assets/male-02.png',
  'marcus vance': '/avatar-assets/male-02.png',
  'marcus': '/avatar-assets/male-02.png',

  // Sophia Lin
  'contact-sophia': '/avatar-assets/female-03.png',
  'profile-sophia': '/avatar-assets/female-03.png',
  'sophia.lin': '/avatar-assets/female-03.png',
  '@sophia.lin': '/avatar-assets/female-03.png',
  'sophia lin': '/avatar-assets/female-03.png',
  'sophia': '/avatar-assets/female-03.png',

  // Julian Thorne
  'contact-julian': '/avatar-assets/male-09.png',
  'profile-julian': '/avatar-assets/male-09.png',
  'julian.thorne': '/avatar-assets/male-09.png',
  '@julian.thorne': '/avatar-assets/male-09.png',
  'julian thorne': '/avatar-assets/male-09.png',
  'julian': '/avatar-assets/male-09.png',

  // Amara Okafor
  'contact-amara': '/avatar-assets/female-05.png',
  'status-amara': '/avatar-assets/female-05.png',
  'profile-amara': '/avatar-assets/female-05.png',
  'amara.okafor': '/avatar-assets/female-05.png',
  '@amara.okafor': '/avatar-assets/female-05.png',
  'amara okafor': '/avatar-assets/female-05.png',
  'amara': '/avatar-assets/female-05.png',
};

/**
 * Deterministic DJB2 hash for mapping arbitrary seeds to the 25 avatars.
 * Never uses Math.random(), 100% deterministic between server and client hydration.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a stable, deterministic avatar URL for any seed (id, username, handle).
 */
export function getDeterministicDemoAvatar(seed: string): string {
  if (!seed) return ALL_AVATARS[0].url;

  const normalized = seed.trim().toLowerCase();
  if (CANONICAL_PERSONA_AVATARS[normalized]) {
    return CANONICAL_PERSONA_AVATARS[normalized];
  }

  // Check without leading @ or prefix
  const stripped = normalized.replace(/^@/, '');
  if (CANONICAL_PERSONA_AVATARS[stripped]) {
    return CANONICAL_PERSONA_AVATARS[stripped];
  }

  // Fallback to deterministic hash index across all 25 avatars
  const index = hashString(normalized) % ALL_AVATARS.length;
  return ALL_AVATARS[index].url;
}

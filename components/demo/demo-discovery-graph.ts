/**
 * Nexus.talks — Phase 10: Connected Discovery Graph
 * 
 * Strict Isolation Guarantees:
 * 1. 100% deterministic local in-memory relationship model.
 * 2. Connects existing demo contacts, living profiles, Nexus Moments,
 *    groups, and creative archives without duplicating core objects.
 * 3. Zero Supabase queries or external network requests.
 */

export type DiscoveryTargetType =
  | 'contact'
  | 'profile'
  | 'story'
  | 'group'
  | 'community'
  | 'creator-corner'
  | 'external';

export type DiscoveryRelationCategory =
  | 'related-moment'
  | 'explore-work'
  | 'continue-conversation'
  | 'similar-interests'
  | 'another-perspective'
  | 'collaborative-circle'
  | 'creator-link';

export interface DiscoveryConnection {
  id: string;
  targetType: DiscoveryTargetType;
  targetId: string;
  title: string;
  subtitle?: string;
  description: string;
  category: DiscoveryRelationCategory;
  categoryLabel: string;
  badge?: string;
  accentColor?: string;
  externalUrl?: string;
  actionLabel: string;
}

export interface DiscoveryNode {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  accentColor: string;
  connections: DiscoveryConnection[];
}

export interface ExplorerProgress {
  visitedContacts: string[];
  openedStoryCount: number;
  viewedLivingProfileCount: number;
  enteredGroupCount: number;
  visitedCreatorCorner: boolean;
  discoveredSecretNote: boolean;
}

/**
 * Deterministic relationship graph connecting existing demo entities:
 * Contacts: contact-aasif, contact-elena, contact-marcus, contact-amara, contact-sophia, contact-julian
 * Stories: status-aasif, status-brand, status-elena, status-marcus, status-amara
 * Groups: group-night-owls, group-creative-lab, group-editorial-circle
 * Communities: comm-after-hours, comm-pixel-society, comm-reading-room
 */
export const DISCOVERY_GRAPH: Record<string, DiscoveryNode> = {
  // ── Aasif (Creator) ────────────────────────────────────────────────────────
  'contact-aasif': {
    id: 'contact-aasif',
    title: 'Aasif',
    subtitle: 'Creator of Nexus.talks',
    category: 'Architecture & Direction',
    accentColor: '#542C38',
    connections: [
      {
        id: 'conn-aasif-story',
        targetType: 'story',
        targetId: 'status-aasif',
        title: 'Philosophy & Intent',
        subtitle: 'Nexus Moments · Fictional Story',
        description: 'Reflections on why Nexus.talks was built to prioritize quiet human connection over algorithmic feeds.',
        category: 'related-moment',
        categoryLabel: 'Related to this moment',
        badge: 'Nexus Moments',
        accentColor: '#542C38',
        actionLabel: 'Watch Story',
      },
      {
        id: 'conn-aasif-profile',
        targetType: 'profile',
        targetId: 'contact-aasif',
        title: "Aasif's Living Profile",
        subtitle: 'Creator archive & craft highlights',
        description: 'Explore personal thoughts, current focus, and acoustic design principles behind Nexus.talks.',
        category: 'explore-work',
        categoryLabel: "Explore this person's work",
        badge: 'Living Profile',
        accentColor: '#6A3947',
        actionLabel: 'Open Profile',
      },
      {
        id: 'conn-aasif-instagram',
        targetType: 'external',
        targetId: 'external-instagram',
        title: 'Instagram (@the_aasif9)',
        subtitle: 'Creator digital journal',
        description: 'Connect directly with Aasif for feedback, design discussions, and behind-the-scenes thoughts.',
        category: 'creator-link',
        categoryLabel: 'Creator link',
        badge: 'Verified',
        accentColor: '#E1306C',
        externalUrl: 'https://www.instagram.com/the_aasif9/',
        actionLabel: 'Visit Instagram',
      },
      {
        id: 'conn-aasif-elena',
        targetType: 'profile',
        targetId: 'contact-elena',
        title: 'Elena Rostova',
        subtitle: 'Architecture Curator',
        description: 'Collaborator studying the tactile resonance of porcelain textures and natural light framing.',
        category: 'similar-interests',
        categoryLabel: 'People with similar interests',
        badge: 'Curator',
        accentColor: '#542C38',
        actionLabel: 'View Elena',
      },
      {
        id: 'conn-aasif-marcus',
        targetType: 'profile',
        targetId: 'contact-marcus',
        title: 'Marcus Vance',
        subtitle: 'Typographer & Design Director',
        description: 'Collaborator refining the optical hierarchy and glass refraction tokens of the UI.',
        category: 'another-perspective',
        categoryLabel: 'Discover another perspective',
        badge: 'Type Director',
        accentColor: '#6A3947',
        actionLabel: 'View Marcus',
      },
    ],
  },

  // ── Elena Rostova ──────────────────────────────────────────────────────────
  'contact-elena': {
    id: 'contact-elena',
    title: 'Elena Rostova',
    subtitle: 'Architecture Curator · Framing Light & Silence',
    category: 'Spatial Design & Light',
    accentColor: '#542C38',
    connections: [
      {
        id: 'conn-elena-story',
        targetType: 'story',
        targetId: 'status-elena',
        title: 'Acoustic Stillness & Tactile Spaces',
        subtitle: 'Nexus Moments · 2 Stories',
        description: 'Elena’s reflections on 4 PM daylight, unpolished stone, and why digital spaces need physical permanence.',
        category: 'related-moment',
        categoryLabel: 'Related to this moment',
        badge: 'Nexus Moments',
        accentColor: '#542C38',
        actionLabel: 'Watch Story',
      },
      {
        id: 'conn-elena-chat',
        targetType: 'contact',
        targetId: 'contact-elena',
        title: 'Direct Conversation',
        subtitle: 'Gallery floor plan discussion',
        description: 'Discuss daylight transitions and the pavilion courtyard layout with Elena in her thread.',
        category: 'continue-conversation',
        categoryLabel: 'Continue the conversation',
        badge: 'Active Thread',
        accentColor: '#542C38',
        actionLabel: 'Message Elena',
      },
      {
        id: 'conn-elena-night-owls',
        targetType: 'group',
        targetId: 'group-night-owls',
        title: 'Night Owls',
        subtitle: 'Elena, Marcus & Sophia',
        description: 'Elena frequently shares midnight sky streams and Perseid meteor observations in this group.',
        category: 'collaborative-circle',
        categoryLabel: 'Collaborative circle',
        badge: 'Group Chat',
        accentColor: '#542C38',
        actionLabel: 'Open Night Owls',
      },
      {
        id: 'conn-elena-julian',
        targetType: 'profile',
        targetId: 'contact-julian',
        title: 'Julian Thorne',
        subtitle: 'Horologist & Micro-Mechanic',
        description: 'Fellow craftsperson sharing an obsession with acoustic silence and physical precision.',
        category: 'similar-interests',
        categoryLabel: 'People with similar interests',
        badge: 'Horology',
        accentColor: '#21191D',
        actionLabel: 'View Julian',
      },
      {
        id: 'conn-elena-creator',
        targetType: 'profile',
        targetId: 'contact-aasif',
        title: 'Aasif',
        subtitle: 'Creator of Nexus.talks',
        description: 'Discover how Elena’s philosophy of spatial stillness shaped the quiet Wine & Porcelain theme.',
        category: 'creator-link',
        categoryLabel: "Discover the Creator's vision",
        badge: 'Creator',
        accentColor: '#542C38',
        actionLabel: 'Meet Aasif',
      },
    ],
  },

  // ── Marcus Vance ───────────────────────────────────────────────────────────
  'contact-marcus': {
    id: 'contact-marcus',
    title: 'Marcus Vance',
    subtitle: 'Typographer & Design Director',
    category: 'Typography & Visual Systems',
    accentColor: '#6A3947',
    connections: [
      {
        id: 'conn-marcus-story',
        targetType: 'story',
        targetId: 'status-marcus',
        title: 'Editorial Proportions & Tactile UI',
        subtitle: 'Nexus Moments · 2 Stories',
        description: 'High-contrast serif headlines paired with unhurried body types: typesetting for the mind.',
        category: 'related-moment',
        categoryLabel: 'Related to this moment',
        badge: 'Nexus Moments',
        accentColor: '#6A3947',
        actionLabel: 'Watch Story',
      },
      {
        id: 'conn-marcus-chat',
        targetType: 'contact',
        targetId: 'contact-marcus',
        title: 'Direct Conversation',
        subtitle: 'Optical font scale discussion',
        description: 'Review responsive typography tokens and optical clarity across devices with Marcus.',
        category: 'continue-conversation',
        categoryLabel: 'Continue the conversation',
        badge: 'Active Thread',
        accentColor: '#6A3947',
        actionLabel: 'Message Marcus',
      },
      {
        id: 'conn-marcus-creative-lab',
        targetType: 'group',
        targetId: 'group-creative-lab',
        title: 'Creative Lab',
        subtitle: '14 members · Interface critique',
        description: 'Marcus tests micro-animations, glass refraction tokens, and mobile contrast ratios here.',
        category: 'collaborative-circle',
        categoryLabel: 'Collaborative circle',
        badge: 'Group Chat',
        accentColor: '#6A3947',
        actionLabel: 'Open Creative Lab',
      },
      {
        id: 'conn-marcus-amara',
        targetType: 'profile',
        targetId: 'contact-amara',
        title: 'Amara Okafor',
        subtitle: 'Creative Technologist',
        description: 'Combines Marcus’s typography systems with sub-15ms local-first data architecture.',
        category: 'another-perspective',
        categoryLabel: 'Discover another perspective',
        badge: 'Technologist',
        accentColor: '#292628',
        actionLabel: 'View Amara',
      },
    ],
  },

  // ── Amara Okafor ───────────────────────────────────────────────────────────
  'contact-amara': {
    id: 'contact-amara',
    title: 'Amara Okafor',
    subtitle: 'Creative Technologist · Local-First Architecture',
    category: 'Engineering & Protocol',
    accentColor: '#292628',
    connections: [
      {
        id: 'conn-amara-story',
        targetType: 'story',
        targetId: 'status-amara',
        title: 'Local-First Intimacy & Human Parlours',
        subtitle: 'Nexus Moments · 2 Stories',
        description: 'Why sub-15ms latency and zero round-trip lag protect the emotional nuance of digital conversations.',
        category: 'related-moment',
        categoryLabel: 'Related to this moment',
        badge: 'Nexus Moments',
        accentColor: '#542C38',
        actionLabel: 'Watch Story',
      },
      {
        id: 'conn-amara-chat',
        targetType: 'contact',
        targetId: 'contact-amara',
        title: 'Direct Conversation',
        subtitle: 'Memory footprint & latency benchmark',
        description: 'Dive into local optimistic states and memory benchmarking on mobile devices.',
        category: 'continue-conversation',
        categoryLabel: 'Continue the conversation',
        badge: 'Active Thread',
        accentColor: '#292628',
        actionLabel: 'Message Amara',
      },
      {
        id: 'conn-amara-editorial-circle',
        targetType: 'group',
        targetId: 'group-editorial-circle',
        title: 'Editorial Circle',
        subtitle: 'Julian & Amara',
        description: 'Collaborating on essays exploring digital hermitages and the architecture of online silence.',
        category: 'collaborative-circle',
        categoryLabel: 'Collaborative circle',
        badge: 'Group Chat',
        accentColor: '#292628',
        actionLabel: 'Open Editorial Circle',
      },
      {
        id: 'conn-amara-sophia',
        targetType: 'profile',
        targetId: 'contact-sophia',
        title: 'Sophia Lin',
        subtitle: 'Computational Botanist',
        description: 'Pairing local-first audio engines with real-time generative cellular simulations.',
        category: 'similar-interests',
        categoryLabel: 'People with similar interests',
        badge: 'Botanist',
        accentColor: '#542C38',
        actionLabel: 'View Sophia',
      },
    ],
  },

  // ── Sophia Lin ─────────────────────────────────────────────────────────────
  'contact-sophia': {
    id: 'contact-sophia',
    title: 'Sophia Lin',
    subtitle: 'Computational Botanist · Generative Audio',
    category: 'Acoustic Arts & Biology',
    accentColor: '#542C38',
    connections: [
      {
        id: 'conn-sophia-chat',
        targetType: 'contact',
        targetId: 'contact-sophia',
        title: 'Direct Conversation',
        subtitle: 'Binaural rain sketches',
        description: 'Listen to ambient generative audio tracks designed for focused late-night writing sessions.',
        category: 'continue-conversation',
        categoryLabel: 'Continue the conversation',
        badge: 'Active Thread',
        accentColor: '#542C38',
        actionLabel: 'Message Sophia',
      },
      {
        id: 'conn-sophia-night-owls',
        targetType: 'group',
        targetId: 'group-night-owls',
        title: 'Night Owls',
        subtitle: 'Deep focus playlist curator',
        description: 'Sophia curates the nocturnal soundtrack for the Night Owls salon.',
        category: 'collaborative-circle',
        categoryLabel: 'Collaborative circle',
        badge: 'Group Chat',
        accentColor: '#542C38',
        actionLabel: 'Open Night Owls',
      },
      {
        id: 'conn-sophia-creator',
        targetType: 'profile',
        targetId: 'contact-aasif',
        title: 'Aasif',
        subtitle: 'Creator of Nexus.talks',
        description: 'Explore how generative audio and acoustic calm inspired the app’s resonant notifications.',
        category: 'creator-link',
        categoryLabel: "Discover the Creator's vision",
        badge: 'Creator',
        accentColor: '#542C38',
        actionLabel: 'Meet Aasif',
      },
    ],
  },

  // ── Julian Thorne ──────────────────────────────────────────────────────────
  'contact-julian': {
    id: 'contact-julian',
    title: 'Julian Thorne',
    subtitle: 'Horologist & Micro-Mechanic',
    category: 'Kinetic Mechanics & Precision',
    accentColor: '#21191D',
    connections: [
      {
        id: 'conn-julian-chat',
        targetType: 'contact',
        targetId: 'contact-julian',
        title: 'Direct Conversation',
        subtitle: 'The architecture of silence',
        description: 'Discuss how physical escapement geometry mirrors digital attention spans.',
        category: 'continue-conversation',
        categoryLabel: 'Continue the conversation',
        badge: 'Active Thread',
        accentColor: '#21191D',
        actionLabel: 'Message Julian',
      },
      {
        id: 'conn-julian-editorial-circle',
        targetType: 'group',
        targetId: 'group-editorial-circle',
        title: 'Editorial Circle',
        subtitle: 'Julian & Amara',
        description: 'Julian is drafting his monograph on the mechanics of contemplative software here.',
        category: 'collaborative-circle',
        categoryLabel: 'Collaborative circle',
        badge: 'Group Chat',
        accentColor: '#292628',
        actionLabel: 'Open Editorial Circle',
      },
      {
        id: 'conn-julian-elena',
        targetType: 'profile',
        targetId: 'contact-elena',
        title: 'Elena Rostova',
        subtitle: 'Architecture Curator',
        description: 'Sharing architectural notes on framing light, stillness, and tactile stone.',
        category: 'similar-interests',
        categoryLabel: 'People with similar interests',
        badge: 'Curator',
        accentColor: '#542C38',
        actionLabel: 'View Elena',
      },
    ],
  },

  // ── Groups (Bidirectional discovery) ───────────────────────────────────────
  'group-night-owls': {
    id: 'group-night-owls',
    title: 'Night Owls',
    subtitle: 'Midnight brainstorms & nocturnal ideas',
    category: 'Public Group',
    accentColor: '#542C38',
    connections: [
      {
        id: 'conn-no-elena',
        targetType: 'profile',
        targetId: 'contact-elena',
        title: 'Elena Rostova',
        subtitle: 'Active group member',
        description: 'Curating meteor shower streams and quiet architectural courtyard observations.',
        category: 'explore-work',
        categoryLabel: 'Key Participant',
        badge: 'Architecture',
        accentColor: '#542C38',
        actionLabel: 'View Profile',
      },
      {
        id: 'conn-no-marcus',
        targetType: 'profile',
        targetId: 'contact-marcus',
        title: 'Marcus Vance',
        subtitle: 'Active group member',
        description: 'Sharing long-exposure astronomical photography and type notes.',
        category: 'explore-work',
        categoryLabel: 'Key Participant',
        badge: 'Typography',
        accentColor: '#6A3947',
        actionLabel: 'View Profile',
      },
      {
        id: 'conn-no-creator',
        targetType: 'profile',
        targetId: 'contact-aasif',
        title: 'Aasif',
        subtitle: 'Creator of Nexus.talks',
        description: 'Learn why Nexus.talks was designed for focused late-night conversations.',
        category: 'creator-link',
        categoryLabel: "Discover the Creator's vision",
        badge: 'Creator',
        accentColor: '#542C38',
        actionLabel: 'Meet Aasif',
      },
    ],
  },

  'group-creative-lab': {
    id: 'group-creative-lab',
    title: 'Creative Lab',
    subtitle: 'Interface prototyping & layout critique',
    category: 'Public Group',
    accentColor: '#6A3947',
    connections: [
      {
        id: 'conn-cl-marcus',
        targetType: 'profile',
        targetId: 'contact-marcus',
        title: 'Marcus Vance',
        subtitle: 'Design Director',
        description: 'Reviewing glass refraction tokens and 60fps mobile responsiveness.',
        category: 'explore-work',
        categoryLabel: 'Key Participant',
        badge: 'Typography',
        accentColor: '#6A3947',
        actionLabel: 'View Profile',
      },
      {
        id: 'conn-cl-creator',
        targetType: 'profile',
        targetId: 'contact-aasif',
        title: 'Aasif',
        subtitle: 'Creator of Nexus.talks',
        description: 'Explore the Wine & Porcelain design tokens formulated in the lab.',
        category: 'creator-link',
        categoryLabel: "Discover the Creator's vision",
        badge: 'Creator',
        accentColor: '#542C38',
        actionLabel: 'Meet Aasif',
      },
    ],
  },

  'group-editorial-circle': {
    id: 'group-editorial-circle',
    title: 'Editorial Circle',
    subtitle: 'Independent essays & long-form writing',
    category: 'Public Group',
    accentColor: '#292628',
    connections: [
      {
        id: 'conn-ec-julian',
        targetType: 'profile',
        targetId: 'contact-julian',
        title: 'Julian Thorne',
        subtitle: 'Horologist & Essayist',
        description: 'Drafting essays on the architecture of silence and digital contemplation.',
        category: 'explore-work',
        categoryLabel: 'Key Participant',
        badge: 'Horology',
        accentColor: '#21191D',
        actionLabel: 'View Profile',
      },
      {
        id: 'conn-ec-amara',
        targetType: 'profile',
        targetId: 'contact-amara',
        title: 'Amara Okafor',
        subtitle: 'Creative Technologist',
        description: 'Contributing research on digital hermitages and private protocols.',
        category: 'explore-work',
        categoryLabel: 'Key Participant',
        badge: 'Technologist',
        accentColor: '#292628',
        actionLabel: 'View Profile',
      },
    ],
  },
};

/**
 * Get related discovery connections for any entity ID
 */
export function getDiscoveryConnections(entityId: string): DiscoveryConnection[] {
  return DISCOVERY_GRAPH[entityId]?.connections || [];
}

/**
 * Get discovery node information
 */
export function getDiscoveryNode(entityId: string): DiscoveryNode | null {
  return DISCOVERY_GRAPH[entityId] || null;
}

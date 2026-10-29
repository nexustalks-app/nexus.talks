export interface Community {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'Culture & Conversation' | 'Design & Technology' | 'Books & Learning' | 'Science & Exploration';
  memberCount: number;
  onlineCount: number;
  badge: string;
  iconName: string;
  visualTheme: {
    primary: string;
    accent: string;
    border: string;
    bgBadge: string;
    textBadge: string;
    cardHighlight: string;
  };
  rules: string[];
  topics: string[];
  featured?: boolean;
}

export const SAMPLE_COMMUNITIES: Community[] = [
  {
    id: 'after-hours',
    name: 'After Hours',
    tagline: 'A relaxed corner for late-night conversations, ideas, and everyday discoveries.',
    description: 'A relaxed corner for late-night conversations, ideas, and everyday discoveries. Whether unwinding after a productive day or sharing sudden inspirations under the moon, welcome to After Hours. Topics drift freely between music, creative pursuits, city walks, and quiet ponderings.',
    category: 'Culture & Conversation',
    memberCount: 2840,
    onlineCount: 42,
    badge: 'AH',
    iconName: 'Moon',
    visualTheme: {
      primary: '#542C38',
      accent: '#6A3947',
      border: 'border-wine/20',
      bgBadge: 'bg-wine/10 dark:bg-wine/25',
      textBadge: 'text-wine dark:text-[#C49DA4]',
      cardHighlight: 'from-wine/15 via-wine/5 to-transparent',
    },
    rules: [
      'Respect quiet evening hours and contemplative discussions.',
      'Constructive, thoughtful discourse with zero hostility.',
      'No promotional spam or unsolicited pitches.',
    ],
    topics: [
      'Late-night reading recommendations',
      'Ambient & lo-fi playlist exchanges',
      'Midnight creative breakthroughs',
      'City night photography & impressions',
    ],
    featured: true,
  },
  {
    id: 'pixel-society',
    name: 'Pixel Society',
    tagline: 'Explore digital creativity, design experiments, and interesting technology.',
    description: 'Explore digital creativity, design experiments, and interesting technology. Share interface craft, typography pairings, shader tricks, design system tokens, and creative engineering projects with fellow builders and visual thinkers.',
    category: 'Design & Technology',
    memberCount: 4120,
    onlineCount: 78,
    badge: 'PS',
    iconName: 'Sparkles',
    visualTheme: {
      primary: '#292628',
      accent: '#A77982',
      border: 'border-rose/30',
      bgBadge: 'bg-rose/15 dark:bg-rose/25',
      textBadge: 'text-wine dark:text-[#C49DA4]',
      cardHighlight: 'from-rose/20 via-rose/5 to-transparent',
    },
    rules: [
      'Provide constructive critique that elevates the craft.',
      'Always attribute original inspirations and references.',
      'Work-in-progress (WIP) shares are actively encouraged.',
    ],
    topics: [
      'Modern glass & tactile micro-interactions',
      'Component token architectures',
      'Design tool scripts & automation',
      'Editorial web layouts & responsive typography',
    ],
    featured: true,
  },
  {
    id: 'reading-room',
    name: 'The Reading Room',
    tagline: 'Share reading recommendations, discuss ideas, and discover new perspectives.',
    description: 'Share reading recommendations, discuss ideas, and discover new perspectives. From timeless philosophy and architecture monographs to contemporary fiction and cognitive science, explore what makes good ideas endure.',
    category: 'Books & Learning',
    memberCount: 1950,
    onlineCount: 24,
    badge: 'RR',
    iconName: 'BookOpen',
    visualTheme: {
      primary: '#6A3947',
      accent: '#542C38',
      border: 'border-burgundy/20',
      bgBadge: 'bg-burgundy/10 dark:bg-burgundy/25',
      textBadge: 'text-burgundy dark:text-[#C49DA4]',
      cardHighlight: 'from-burgundy/15 via-burgundy/5 to-transparent',
    },
    rules: [
      'Place plot spoilers behind spoiler warnings.',
      'Embrace diverse viewpoints and respectful interpretation.',
      'Recommend with a short sentence explaining why you loved it.',
    ],
    topics: [
      'Monthly non-fiction deep dives',
      'Architecture & industrial design monographs',
      'Marginalia & reading notes sharing',
      'Independent publishing & small press gems',
    ],
    featured: false,
  },
  {
    id: 'orbit-club',
    name: 'Orbit Club',
    tagline: 'Discuss space, science, astronomy, and fascinating discoveries.',
    description: 'Discuss space, science, astronomy, and fascinating discoveries. From James Webb space telescope observations and orbital mechanics to planetary geology and deep-sky imaging logs, join our journey beyond the atmosphere.',
    category: 'Science & Exploration',
    memberCount: 3410,
    onlineCount: 56,
    badge: 'OC',
    iconName: 'Compass',
    visualTheme: {
      primary: '#21191D',
      accent: '#E8E2DE',
      border: 'border-stone-strong/40',
      bgBadge: 'bg-stone/50 dark:bg-stone/20',
      textBadge: 'text-charcoal dark:text-porcelain',
      cardHighlight: 'from-stone/25 via-stone/5 to-transparent dark:from-stone/10',
    },
    rules: [
      'Rely on fact-checked scientific sources and citations.',
      'Genuine curiosity and wonder are always welcomed.',
      'Astrophotography equipment advice & capture settings.',
    ],
    topics: [
      'Deep space imagery & spectrographic analysis',
      'Telescope collimation & planetary observation',
      'Exoplanet detection techniques',
      'Propulsion physics & orbital navigation',
    ],
    featured: false,
  },
];

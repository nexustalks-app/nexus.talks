/**
 * Nexus.talks — Phase 6: Isolated Demo Data & Fixtures
 * 
 * Strict Isolation Guarantees:
 * 1. 100% deterministic local memory objects.
 * 2. Zero Supabase queries or network mutation endpoints.
 * 3. Zero leakage of real accounts, usernames, or database rows.
 */

import { getDeterministicDemoAvatar } from '@/lib/avatar/avatar-collection';
export { getDeterministicDemoAvatar } from '@/lib/avatar/avatar-collection';

export interface DemoMessage {
  id: string;
  senderId: 'self' | 'contact';
  senderName: string;
  senderInitials: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  isAudio?: boolean;
  audioDuration?: string;
  isImage?: boolean;
  imageUrl?: string;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    isDeleted?: boolean;
  };
  reactions?: {
    emoji: string;
    count: number;
    hasReacted: boolean;
  }[];
  editedAt?: string;
  isDeleted?: boolean;
}

export interface DemoContact {
  id: string;
  name: string;
  username?: string;
  handle: string;
  subtitle?: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  textColor: string;
  status: 'online' | 'away' | 'offline';
  statusText: string;
  bio: string;
  lastSeen?: string;
  lastMessageSnippet: string;
  lastMessageTime: string;
  unreadCount: number;
  isCreator?: boolean;
  isGroup?: boolean;
  isPinned?: boolean;
  pinnedAt?: string | null;
  badgeLabel?: string;
  instagramHandle?: string;
  instagramUrl?: string;
  conversation: DemoMessage[];
}

export interface DemoCommunity {
  id: string;
  name: string;
  tagline: string;
  category: string;
  memberCount: number;
  onlineCount: number;
  badge: string;
  accentColor: string;
  description: string;
  topics: string[];
}

export interface DemoGroup {
  id: string;
  name: string;
  topic: string;
  description: string;
  memberCount: number;
  onlineCount: number;
  monogram: string;
  accentColor: string;
  messages: {
    id: string;
    senderName: string;
    senderInitials: string;
    content: string;
    time: string;
    isOwn?: boolean;
  }[];
}

export interface DemoStoryCard {
  id: string;
  tagline?: string;
  content: string;
  image?: string;
  accentColor?: string;
  bgGradient?: string;
  link?: {
    label: string;
    url: string;
    isExternal?: boolean;
  };
  secondaryLink?: {
    label: string;
    url: string;
    isExternal?: boolean;
  };
  timestamp: string;
}

export interface DemoStatusProfile {
  id: string;
  name: string;
  handle: string;
  username: string;
  role: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  avatarUrl?: string;
  isCreator?: boolean;
  isBrand?: boolean;
  badge?: string;
  statusDot?: 'online' | 'brand' | 'curator';
  stories: DemoStoryCard[];
}

export interface DemoProfileLink {
  label: string;
  url: string;
  isExternal?: boolean;
  description?: string;
}

export interface DemoProfileHighlight {
  id: string;
  title: string;
  category: string;
  description: string;
  date: string;
  linkUrl?: string;
  isExternal?: boolean;
}

export interface DemoLivingProfile {
  id: string;
  contactId: string;
  name: string;
  username: string;
  handle: string;
  role: string;
  badge?: string;
  isCreator?: boolean;
  status: 'online' | 'away' | 'offline';
  statusText: string;
  avatarBg: string;
  avatarText: string;
  avatarUrl?: string;
  initials: string;
  coverImage?: string;
  coverGradient: string;
  bio: string;
  currentMood: string;
  favoriteQuote: string;
  quoteAttribution?: string;
  location?: string;
  interests: string[];
  statusProfileId?: string;
  instagramUrl?: string;
  links: DemoProfileLink[];
  highlights: DemoProfileHighlight[];
}

export const DEMO_CONTACTS: DemoContact[] = [
  {
    id: 'contact-aasif',
    name: 'Mr Aasif',
    username: '@the_aasif9',
    handle: 'the_aasif9',
    subtitle: 'Creator of Nexus.talks',
    initials: 'A',
    avatarColor: 'bg-wine text-white shadow-md shadow-wine/25 border-t border-white/25',
    avatarUrl: getDeterministicDemoAvatar('contact-aasif'),
    textColor: 'text-white',
    status: 'online',
    statusText: 'Creator of Nexus.talks',
    bio: 'Building things, exploring ideas, and making conversations feel more human.',
    lastMessageSnippet: 'Say hi to start chatting ✨',
    lastMessageTime: 'Online',
    unreadCount: 1,
    isCreator: true,
    isPinned: true,
    pinnedAt: '2026-10-27T10:00:00Z',
    badgeLabel: 'Creator',
    instagramHandle: '@the_aasif9',
    instagramUrl: 'https://www.instagram.com/the_aasif9/',
    conversation: [],
  },
  {
    id: 'contact-elena',
    name: 'Elena Rostova',
    handle: 'elena.rostova',
    initials: 'ER',
    avatarColor: 'bg-[#542C38]',
    avatarUrl: getDeterministicDemoAvatar('contact-elena'),
    textColor: 'text-white',
    status: 'online',
    statusText: 'Architecture curator · Framing light & silence',
    bio: 'Independent architectural researcher studying chiaroscuro lighting and acoustic intimacy in contemporary spaces.',
    lastMessageSnippet: 'I’ve attached the gallery floor plans. The natural daylight at 4 PM is ethereal.',
    lastMessageTime: '10:48 AM',
    unreadCount: 2,
    conversation: [
      {
        id: 'msg-er-1',
        senderId: 'contact',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: 'Did you get a chance to review the floor layout for the pavilion installation?',
        timestamp: '10:32 AM',
        isOwn: false,
      },
      {
        id: 'msg-er-2',
        senderId: 'self',
        senderName: 'You',
        senderInitials: 'ME',
        content: 'Yes! The transition between the high-contrast vestibule and the quiet courtyard is stunning.',
        timestamp: '10:38 AM',
        isOwn: true,
      },
      {
        id: 'msg-er-3',
        senderId: 'contact',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: 'Exactly what we wanted. It gives visitors a moment to decompress before stepping into the central hall.',
        timestamp: '10:42 AM',
        isOwn: false,
        reactions: [
          { emoji: '❤️', count: 1, hasReacted: false },
        ],
      },
      {
        id: 'msg-er-4',
        senderId: 'contact',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: 'I’ve attached the gallery floor plans. The natural daylight at 4 PM is ethereal.',
        timestamp: '10:48 AM',
        isOwn: false,
        replyTo: {
          id: 'msg-er-2',
          senderName: 'You',
          content: 'Yes! The transition between the high-contrast vestibule and the quiet courtyard is stunning.',
        },
        reactions: [
          { emoji: '🔥', count: 1, hasReacted: false },
        ],
      },
      {
        id: 'msg-er-5',
        senderId: 'contact',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: '/images/auth-eye-atmosphere.jpg',
        isImage: true,
        imageUrl: '/images/auth-eye-atmosphere.jpg',
        timestamp: '10:50 AM',
        isOwn: false,
      },
      {
        id: 'msg-er-6',
        senderId: 'contact',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: '/documents/pavilion-light-study.pdf',
        timestamp: '10:52 AM',
        isOwn: false,
      },
      {
        id: 'msg-er-7',
        senderId: 'contact',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: 'Here is the monograph on chiaroscuro spaces: https://architecturaldigest.com/story/light-pavilions-study',
        timestamp: '10:55 AM',
        isOwn: false,
      },
    ],
  },
  {
    id: 'contact-marcus',
    name: 'Marcus Vance',
    handle: 'marcus.vance',
    initials: 'MV',
    avatarColor: 'bg-[#6A3947]',
    avatarUrl: getDeterministicDemoAvatar('contact-marcus'),
    textColor: 'text-white',
    status: 'online',
    statusText: 'Typographer & design director',
    bio: 'Foundry director specializing in high-contrast editorial serifs, proportional optical sizes, and tactile UI.',
    lastMessageSnippet: 'Let’s test the editorial serif at 32px on the mobile canvas.',
    lastMessageTime: '09:15 AM',
    unreadCount: 0,
    conversation: [
      {
        id: 'msg-mv-1',
        senderId: 'self',
        senderName: 'You',
        senderInitials: 'ME',
        content: 'The optical weights on Playfair Display with Plus Jakarta Sans look extremely refined in both themes.',
        timestamp: '08:52 AM',
        isOwn: true,
      },
      {
        id: 'msg-mv-2',
        senderId: 'contact',
        senderName: 'Marcus Vance',
        senderInitials: 'MV',
        content: 'The generous leading on titles creates that calm editorial rhythm you only see in print monographs.',
        timestamp: '09:04 AM',
        isOwn: false,
      },
      {
        id: 'msg-mv-3',
        senderId: 'contact',
        senderName: 'Marcus Vance',
        senderInitials: 'MV',
        content: 'Let’s test the editorial serif at 32px on the mobile canvas.',
        timestamp: '09:15 AM',
        isOwn: false,
      },
    ],
  },
  {
    id: 'contact-sophia',
    name: 'Sophia Lin',
    handle: 'sophia.lin',
    initials: 'SL',
    avatarColor: 'bg-[#A77982]',
    avatarUrl: getDeterministicDemoAvatar('contact-sophia'),
    textColor: 'text-white',
    status: 'away',
    statusText: 'Acoustic ecology & sound design',
    bio: 'Composer exploring natural reverberation, binaural field recordings, and restorative listening sessions.',
    lastMessageSnippet: 'Listen to the field recordings from the rainy Kyoto courtyard.',
    lastMessageTime: 'Yesterday',
    unreadCount: 1,
    conversation: [
      {
        id: 'msg-sl-1',
        senderId: 'contact',
        senderName: 'Sophia Lin',
        senderInitials: 'SL',
        content: 'Finished mastering the 40-minute rain soundscape for the focus session.',
        timestamp: 'Yesterday 04:12 PM',
        isOwn: false,
      },
      {
        id: 'msg-sl-2',
        senderId: 'self',
        senderName: 'You',
        senderInitials: 'ME',
        content: 'Can’t wait to put on headphones and write with it playing in the background.',
        timestamp: 'Yesterday 04:20 PM',
        isOwn: true,
      },
      {
        id: 'msg-sl-3',
        senderId: 'contact',
        senderName: 'Sophia Lin',
        senderInitials: 'SL',
        content: 'Listen to the field recordings from the rainy Kyoto courtyard.',
        timestamp: 'Yesterday 04:25 PM',
        isOwn: false,
      },
    ],
  },
  {
    id: 'contact-julian',
    name: 'Julian Thorne',
    handle: 'julian.thorne',
    initials: 'JT',
    avatarColor: 'bg-[#292628]',
    avatarUrl: getDeterministicDemoAvatar('contact-julian'),
    textColor: 'text-[#F7F4F1]',
    status: 'offline',
    lastSeen: '2 hours ago',
    statusText: 'Philosophy fellow · Oxford',
    bio: 'Writing on digital contemplative spaces, the ethics of attention, and modern epistemological solitude.',
    lastMessageSnippet: 'Agreed. Sustained dialogue requires quiet spaces.',
    lastMessageTime: 'Oct 22',
    unreadCount: 0,
    conversation: [
      {
        id: 'msg-jt-1',
        senderId: 'contact',
        senderName: 'Julian Thorne',
        senderInitials: 'JT',
        content: 'Have you noticed how algorithmic feeds dismantle our capacity for sustained reflection?',
        timestamp: 'Oct 22 02:15 PM',
        isOwn: false,
      },
      {
        id: 'msg-jt-2',
        senderId: 'self',
        senderName: 'You',
        senderInitials: 'ME',
        content: 'Completely. Private messaging with zero vanity metrics is the antidote.',
        timestamp: 'Oct 22 02:22 PM',
        isOwn: true,
      },
      {
        id: 'msg-jt-3',
        senderId: 'contact',
        senderName: 'Julian Thorne',
        senderInitials: 'JT',
        content: 'That passage on digital intimacy by Byung-Chul Han was spot on.',
        timestamp: 'Oct 22 02:30 PM',
        isOwn: false,
      },
      {
        id: 'msg-jt-4',
        senderId: 'self',
        senderName: 'You',
        senderInitials: 'ME',
        content: 'Agreed. Sustained dialogue requires quiet spaces.',
        timestamp: 'Oct 22 02:35 PM',
        isOwn: true,
      },
    ],
  },
  {
    id: 'contact-amara',
    name: 'Amara Okafor',
    handle: 'amara.okafor',
    initials: 'AO',
    avatarColor: 'bg-[#542C38]',
    avatarUrl: getDeterministicDemoAvatar('contact-amara'),
    textColor: 'text-[#E8E2DE]',
    status: 'online',
    statusText: 'Creative technologist · Small web salons',
    bio: 'Engineering decentralized peer nodes, local-first data sync engines, and distraction-free collaboration tools.',
    lastMessageSnippet: 'The local-first sync algorithm is down to sub-15ms latency.',
    lastMessageTime: 'Oct 21',
    unreadCount: 0,
    conversation: [
      {
        id: 'msg-ao-1',
        senderId: 'contact',
        senderName: 'Amara Okafor',
        senderInitials: 'AO',
        content: 'Optimized the reactive state tree. Benchmarks are silky smooth.',
        timestamp: 'Oct 21 11:05 AM',
        isOwn: false,
      },
      {
        id: 'msg-ao-2',
        senderId: 'self',
        senderName: 'You',
        senderInitials: 'ME',
        content: 'How is memory consumption on lower-end mobile devices?',
        timestamp: 'Oct 21 11:12 AM',
        isOwn: true,
      },
      {
        id: 'msg-ao-3',
        senderId: 'contact',
        senderName: 'Amara Okafor',
        senderInitials: 'AO',
        content: 'The local-first sync algorithm is down to sub-15ms latency.',
        timestamp: 'Oct 21 11:18 AM',
        isOwn: false,
      },
    ],
  },
];

export const DEMO_COMMUNITIES: DemoCommunity[] = [
  {
    id: 'comm-after-hours',
    name: 'After Hours',
    tagline: 'Late-night conversations, quiet discoveries, and nocturnal ideas.',
    category: 'Culture & Conversation',
    memberCount: 2840,
    onlineCount: 42,
    badge: 'AH',
    accentColor: '#542C38',
    description: 'A relaxed corner for late-night conversations, ideas, and everyday discoveries. Whether unwinding after a productive day or sharing sudden inspirations under the moon, welcome to After Hours.',
    topics: ['Late-night reading', 'Ambient playlists', 'Midnight breakthroughs', 'Night photography'],
  },
  {
    id: 'comm-pixel-society',
    name: 'Pixel Society',
    tagline: 'Digital craft, interface experiments, and creative engineering.',
    category: 'Design & Technology',
    memberCount: 4120,
    onlineCount: 78,
    badge: 'PS',
    accentColor: '#6A3947',
    description: 'Explore digital creativity, tactile interfaces, and interesting technology. Share interface craft, typography pairings, shader tricks, and design system tokens with fellow builders.',
    topics: ['Tactile micro-interactions', 'Design systems', 'Typography pairings', 'Creative coding'],
  },
  {
    id: 'comm-reading-room',
    name: 'The Reading Room',
    tagline: 'Shared reading recommendations, essays, and timeless ideas.',
    category: 'Books & Learning',
    memberCount: 1950,
    onlineCount: 24,
    badge: 'RR',
    accentColor: '#A77982',
    description: 'From classic philosophy monographs to contemporary fiction, explore essays and discussions on what makes good ideas endure across decades.',
    topics: ['Architecture monographs', 'Philosophy essays', 'Cognitive science', 'Book notes'],
  },
];

export const DEMO_GROUPS: DemoGroup[] = [
  {
    id: 'group-night-owls',
    name: 'Night Owls',
    topic: 'Midnight brainstorms, quiet hours playlist shares & ideas',
    description: 'Casual conversations and interesting late-night topics for when the city sleeps.',
    memberCount: 8,
    onlineCount: 3,
    monogram: 'NO',
    accentColor: '#542C38',
    messages: [
      {
        id: 'gm-1',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: 'Anyone watching the meteor shower stream tonight? The sky is exceptionally clear.',
        time: '01:14 AM',
      },
      {
        id: 'gm-2',
        senderName: 'Marcus Vance',
        senderInitials: 'MV',
        content: 'Just tuned in. The Perseid trails look unbelievable through high-exposure lenses.',
        time: '01:18 AM',
      },
      {
        id: 'gm-3',
        senderName: 'Sophia Lin',
        senderInitials: 'SL',
        content: 'Bookmarking this playlist for tonight’s writing session. Deep focus vibes.',
        time: '01:25 AM',
      },
    ],
  },
  {
    id: 'group-creative-lab',
    name: 'Creative Lab',
    topic: 'Interface prototyping, micro-animations & layout critique',
    description: 'Share creative experiments, design ideas, and works in progress with constructive peer feedback.',
    memberCount: 14,
    onlineCount: 6,
    monogram: 'CL',
    accentColor: '#6A3947',
    messages: [
      {
        id: 'gm-4',
        senderName: 'David Karr',
        senderInitials: 'DK',
        content: 'Tested the 14px blur glass panel on mobile screens today. Fluid 60fps on standard phones!',
        time: '11:32 AM',
      },
      {
        id: 'gm-5',
        senderName: 'Chloe Bennett',
        senderInitials: 'CB',
        content: 'The contrast ratios on the Wine & Porcelain tokens feel very comfortable in dark mode.',
        time: '11:45 AM',
      },
    ],
  },
  {
    id: 'group-editorial-circle',
    name: 'Editorial Circle',
    topic: 'Independent essays, print publications & typography',
    description: 'Collaborative writing salon for long-form essays, literary critiques, and type specimens.',
    memberCount: 6,
    onlineCount: 2,
    monogram: 'EC',
    accentColor: '#292628',
    messages: [
      {
        id: 'gm-6',
        senderName: 'Julian Thorne',
        senderInitials: 'JT',
        content: 'Drafting a new piece on the architecture of silence. Will share the outline shortly.',
        time: '03:10 PM',
      },
      {
        id: 'gm-7',
        senderName: 'Amara Okafor',
        senderInitials: 'AO',
        content: 'Would love to read it. Let me know when you need notes on the digital hermitage section.',
        time: '03:25 PM',
      },
    ],
  },
];

export const DEMO_STATUS_PROFILES: DemoStatusProfile[] = [
  {
    id: 'status-aasif',
    name: 'Mr Aasif',
    handle: 'the_aasif9',
    username: '@the_aasif9',
    role: 'Creator of Nexus.talks',
    initials: 'A',
    avatarBg: 'bg-wine text-white shadow-md shadow-wine/30 border-t border-white/25',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('status-aasif'),
    isCreator: true,
    badge: 'Creator',
    statusDot: 'online',
    stories: [
      {
        id: 'aasif-story-1',
        tagline: 'Philosophy & Intent',
        content: '“I didn\'t build this just to send messages. I wanted to build something people would actually want to explore. This is only the beginning. 🖤”',
        timestamp: '2h ago',
        accentColor: '#542C38',
        bgGradient: 'from-[#2A161E] via-[#1B1115] to-[#120B0E]',
      },
      {
        id: 'aasif-story-2',
        tagline: 'Craft & Focus',
        content: '“Building, experimenting, learning — and trying to make every detail feel intentional.”',
        timestamp: '1h ago',
        accentColor: '#6A3947',
        bgGradient: 'from-[#331C24] via-[#1E1217] to-[#140D10]',
        link: {
          label: 'Say hi on Instagram (@the_aasif9)',
          url: 'https://www.instagram.com/the_aasif9/',
          isExternal: true,
        },
      },
      {
        id: 'aasif-story-3',
        tagline: 'A Quiet Sanctuary',
        content: '“In an internet crowded with notifications and vanity feeds, quiet digital sanctuaries matter. Thank you for exploring Nexus.talks.”',
        timestamp: 'Just now',
        accentColor: '#542C38',
        bgGradient: 'from-[#2C1820] via-[#1A1014] to-[#100A0D]',
        link: {
          label: 'Visit @the_aasif9 on Instagram',
          url: 'https://www.instagram.com/the_aasif9/',
          isExternal: true,
        },
      },
    ],
  },
  {
    id: 'status-brand',
    name: 'Nexus.talks',
    handle: 'nexus.talks',
    username: '@nexus.talks',
    role: 'Official Brand Identity',
    initials: 'N',
    avatarBg: 'bg-wine text-white shadow-md shadow-wine/25 border-t border-white/20',
    avatarText: 'text-white',
    isBrand: true,
    badge: 'Official',
    statusDot: 'brand',
    stories: [
      {
        id: 'brand-story-1',
        tagline: 'The Manifesto',
        content: '“Less noise. More meaning. A little corner of the internet built around conversations that feel human.”',
        timestamp: '4h ago',
        accentColor: '#542C38',
        bgGradient: 'from-[#2D1620] via-[#1C1217] to-[#120C0F]',
      },
      {
        id: 'brand-story-2',
        tagline: 'Invitation',
        content: '“Explore the people. Open a conversation. Discover the details. Your next favourite corner of the internet might be here.”',
        timestamp: '3h ago',
        accentColor: '#6A3947',
        bgGradient: 'from-[#351C26] via-[#1F1217] to-[#130C0F]',
        link: {
          label: 'Explore Interactive Demo',
          url: '/demo',
          isExternal: false,
        },
        secondaryLink: {
          label: 'Create Free Account →',
          url: '/signup',
          isExternal: false,
        },
      },
    ],
  },
  {
    id: 'status-elena',
    name: 'Elena Rostova',
    handle: 'elena.rostova',
    username: '@elena.rostova',
    role: 'Architecture Curator',
    initials: 'ER',
    avatarBg: 'bg-[#542C38] text-white',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('status-elena'),
    badge: 'Curator',
    statusDot: 'online',
    stories: [
      {
        id: 'elena-story-1',
        tagline: 'Acoustic Stillness',
        content: '“Observing the 4 PM daylight slicing through the gallery pavilion. Light and silence aren\'t empty voids — they are materials that frame our thoughts.”',
        timestamp: '5h ago',
        accentColor: '#542C38',
        bgGradient: 'from-[#2A171F] via-[#1B1116] to-[#120B0E]',
      },
      {
        id: 'elena-story-2',
        tagline: 'Tactile Architecture',
        content: '“Porcelain textures, deep wine velvets, unpolished stone. When digital spaces mimic physical permanence, conversations linger longer.”',
        timestamp: '3h ago',
        accentColor: '#A77982',
        bgGradient: 'from-[#26151C] via-[#1A1015] to-[#110A0D]',
      },
    ],
  },
  {
    id: 'status-marcus',
    name: 'Marcus Vance',
    handle: 'marcus.vance',
    username: '@marcus.vance',
    role: 'Typographer & Design Director',
    initials: 'MV',
    avatarBg: 'bg-[#6A3947] text-white',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('status-marcus'),
    badge: 'Type Director',
    statusDot: 'online',
    stories: [
      {
        id: 'marcus-story-1',
        tagline: 'Editorial Proportions',
        content: '“High-contrast serif headlines paired with quiet, unhurried body types. Typesetting for the screen is typography for the mind.”',
        timestamp: '6h ago',
        accentColor: '#6A3947',
        bgGradient: 'from-[#2F1A23] via-[#1D1217] to-[#130C0F]',
      },
      {
        id: 'marcus-story-2',
        tagline: 'Tactile UI',
        content: '“Buttons that depress with intention, borders with subtle glass refraction, and transitions that breathe. Craft is respecting the reader\'s attention.”',
        timestamp: '2h ago',
        accentColor: '#542C38',
        bgGradient: 'from-[#28151D] via-[#1A1014] to-[#100A0D]',
      },
    ],
  },
  {
    id: 'status-amara',
    name: 'Amara Okafor',
    handle: 'amara.okafor',
    username: '@amara.okafor',
    role: 'Creative Technologist',
    initials: 'AO',
    avatarBg: 'bg-[#292628] text-white',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('status-amara'),
    badge: 'Technologist',
    statusDot: 'online',
    stories: [
      {
        id: 'amara-story-1',
        tagline: 'Local-First Intimacy',
        content: '“Zero roundtrip lag, instant optimistic state, and private encrypted channels. Technology feels magical when it gets out of the way of the message.”',
        timestamp: '7h ago',
        accentColor: '#542C38',
        bgGradient: 'from-[#2B171F] via-[#1B1115] to-[#120C0E]',
      },
      {
        id: 'amara-story-2',
        tagline: 'Human Parlours',
        content: '“We don\'t need another engagement trap. We need digital parlours where ideas can be shared in confidence and quiet clarity.”',
        timestamp: '4h ago',
        accentColor: '#6A3947',
        bgGradient: 'from-[#301A24] via-[#1D1217] to-[#130B0F]',
      },
    ],
  },
];

export const DEMO_LIVING_PROFILES: DemoLivingProfile[] = [
  {
    id: 'profile-aasif',
    contactId: 'contact-aasif',
    name: 'Mr Aasif',
    username: '@the_aasif9',
    handle: 'the_aasif9',
    role: 'Creator of Nexus.talks',
    badge: 'Creator',
    isCreator: true,
    status: 'online',
    statusText: 'Creator of Nexus.talks · Building & experimenting',
    avatarBg: 'bg-wine text-white shadow-xl shadow-wine/30 border-2 border-white/20',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('profile-aasif'),
    initials: 'A',
    coverImage: '/images/auth-eye-atmosphere.jpg',
    coverGradient: 'from-[#331C24] via-[#1E1116] to-[#120B0E]',
    bio: 'Building things, exploring ideas, and making conversations feel more human. Designing quiet software that prioritizes substance, tactile craftsmanship, and acoustic stillness over algorithmic feeds.',
    currentMood: '“Obsessing over micro-animations and typography proportions.”',
    favoriteQuote: '“In an era of relentless noise, intimacy and private conversation are the ultimate luxury.”',
    quoteAttribution: 'Aasif — Creator Note',
    location: 'Digital Atelier · Open Web',
    interests: [
      'Interface Architecture',
      'Tactile Motion Systems',
      'Typography & Serifs',
      'Local-First State',
      'Acoustic Stillness',
    ],
    statusProfileId: 'status-aasif',
    instagramUrl: 'https://www.instagram.com/the_aasif9/',
    links: [
      {
        label: 'Instagram (@the_aasif9)',
        url: 'https://www.instagram.com/the_aasif9/',
        isExternal: true,
        description: 'Creator updates, design experiments, and direct messages.',
      },
      {
        label: 'Nexus.talks Welcome',
        url: '/',
        isExternal: false,
        description: 'The editorial gateway and philosophy behind Nexus.talks.',
      },
    ],
    highlights: [
      {
        id: 'hl-aasif-1',
        title: 'The Living Profiles Architecture',
        category: 'Product Craft',
        description: 'Transforming contact lists from flat rows into tactile, exploratory character studies.',
        date: 'Phase 9 Release',
      },
      {
        id: 'hl-aasif-2',
        title: 'Wine & Porcelain Design System',
        category: 'Visual Direction',
        description: 'Warm ceramic porcelain tones balanced by rich burgundy shadows and editorial serifs.',
        date: 'Signature Aesthetic',
      },
      {
        id: 'hl-aasif-3',
        title: 'Nexus Moments Story Engine',
        category: 'Interaction',
        description: 'Deterministic local story viewer with hold-to-pause and segmented timeline bars.',
        date: 'Phase 8 Release',
      },
    ],
  },
  {
    id: 'profile-elena',
    contactId: 'contact-elena',
    name: 'Elena Rostova',
    username: '@elena.rostova',
    handle: 'elena.rostova',
    role: 'Architecture Curator · Framing Light & Silence',
    badge: 'Curator',
    status: 'online',
    statusText: 'Architecture curator · Framing light & silence',
    avatarBg: 'bg-[#542C38] text-white shadow-lg border-2 border-white/20',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('profile-elena'),
    initials: 'ER',
    coverImage: '/images/auth-eye.jpg',
    coverGradient: 'from-[#2C1721] via-[#1C1116] to-[#110A0D]',
    bio: 'Independent architectural researcher studying chiaroscuro lighting, natural transitions, and acoustic intimacy in contemporary spaces.',
    currentMood: '“Analyzing 4 PM pavilion daylight angles and gallery acoustics.”',
    favoriteQuote: '“Light and silence are not empty voids — they are the raw materials that frame our thoughts.”',
    quoteAttribution: 'Elena Rostova — Architectural Journal',
    location: 'Vienna & Milan',
    interests: [
      'Chiaroscuro Studies',
      'Spatial Acoustics',
      'Tactile Stone & Ceramics',
      'Gallery Floorplans',
      'Silence as Material',
    ],
    statusProfileId: 'status-elena',
    links: [
      {
        label: 'Curatorial Archive',
        url: '#',
        isExternal: false,
        description: 'Selected floorplans and daylight interaction sketches.',
      },
    ],
    highlights: [
      {
        id: 'hl-elena-1',
        title: 'Pavilion Daylight & Shadow Study',
        category: 'Spatial Research',
        description: 'High-contrast vestibules transitioning into quiet open-air courtyards.',
        date: 'October 2026',
      },
      {
        id: 'hl-elena-2',
        title: 'The Acoustics of Intimate Conversation',
        category: 'Curatorial Essay',
        description: 'How sound reverberation in physical architecture shapes human emotional openness.',
        date: 'Summer 2026',
      },
    ],
  },
  {
    id: 'profile-marcus',
    contactId: 'contact-marcus',
    name: 'Marcus Vance',
    username: '@marcus.vance',
    handle: 'marcus.vance',
    role: 'Typographer & Design Director',
    badge: 'Type Director',
    status: 'online',
    statusText: 'Typographer & design director',
    avatarBg: 'bg-[#6A3947] text-white shadow-lg border-2 border-white/20',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('profile-marcus'),
    initials: 'MV',
    coverGradient: 'from-[#301B24] via-[#1E1218] to-[#130C0F]',
    bio: 'Foundry director specializing in high-contrast editorial serifs, proportional optical sizes, and tactile UI surfaces.',
    currentMood: '“Testing editorial serifs at 32px on high-DPI glass screens.”',
    favoriteQuote: '“Typesetting for the screen is typography for the mind. Spacing is the breath between ideas.”',
    quoteAttribution: 'Marcus Vance — Specimen Notes',
    location: 'London & Tokyo',
    interests: [
      'High-Contrast Serifs',
      'Optical Proportions',
      'Letterpress Craft',
      'Tactile UI Boundaries',
      'Editorial Grids',
    ],
    statusProfileId: 'status-marcus',
    links: [
      {
        label: 'Type Foundry Specimen',
        url: '#',
        isExternal: false,
        description: 'Proportional optical sizes for digital reading screens.',
      },
    ],
    highlights: [
      {
        id: 'hl-marcus-1',
        title: 'Proportional Optical Sizes for Digital Reading',
        category: 'Typography Specimen',
        description: 'Dynamic contrast modulation across smartphone and desktop canvases.',
        date: 'September 2026',
      },
      {
        id: 'hl-marcus-2',
        title: 'Tactile Weight in Modern Buttons',
        category: 'Micro-Interaction',
        description: 'Why 1px inner highlights and top-edge reflections feel genuinely physical.',
        date: 'August 2026',
      },
    ],
  },
  {
    id: 'profile-amara',
    contactId: 'contact-amara',
    name: 'Amara Okafor',
    username: '@amara.okafor',
    handle: 'amara.okafor',
    role: 'Creative Technologist & Distributed Systems',
    badge: 'Technologist',
    status: 'online',
    statusText: 'Creative technologist & distributed systems',
    avatarBg: 'bg-[#292628] text-white shadow-lg border-2 border-white/20',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('profile-amara'),
    initials: 'AO',
    coverGradient: 'from-[#2B171F] via-[#1C1115] to-[#120C0E]',
    bio: 'Building local-first, low-latency communication tools. Passionate about deterministic optimistic UI, strict encryption isolation, and software that gets out of the way.',
    currentMood: '“Benchmark testing local state synchronization down to 12ms.”',
    favoriteQuote: '“Technology feels magical not when it demands your attention, but when it dissolves into the background of a meaningful conversation.”',
    quoteAttribution: 'Amara Okafor — Technical Memo',
    location: 'Nairobi & Berlin',
    interests: [
      'Local-First Architecture',
      'Deterministic State Machines',
      'End-to-End Cryptography',
      'Optimistic UI',
      'Zero-Lag Protocols',
    ],
    statusProfileId: 'status-amara',
    links: [
      {
        label: 'Local-First Research Benchmarks',
        url: '#',
        isExternal: false,
        description: 'Sub-15ms message rendering and offline conflict resolution.',
      },
    ],
    highlights: [
      {
        id: 'hl-amara-1',
        title: 'Sub-15ms Local State Hydration',
        category: 'Engine Benchmark',
        description: 'Optimistic message insertion with deterministic conflict resolution.',
        date: 'October 2026',
      },
      {
        id: 'hl-amara-2',
        title: 'The Privacy of Isolated Channels',
        category: 'Cryptographic Note',
        description: 'Row-Level isolation combined with client-side state sandboxing.',
        date: 'July 2026',
      },
    ],
  },
  {
    id: 'profile-sophia',
    contactId: 'contact-sophia',
    name: 'Sophia Lin',
    username: '@sophia.lin',
    handle: 'sophia.lin',
    role: 'Acoustic Soundscape Artist & Curator',
    badge: 'Sound Designer',
    status: 'away',
    statusText: 'Soundscape designer & acoustic researcher',
    avatarBg: 'bg-[#A77982] text-white shadow-lg border-2 border-white/20',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('profile-sophia'),
    initials: 'SL',
    coverGradient: 'from-[#2A1821] via-[#1B1116] to-[#110B0E]',
    bio: 'Binaural sound designer recording environmental acoustics, ambient stillness, and natural reverberations across temple courtyards and quiet city corners.',
    currentMood: '“Mixing field recordings of rainy Kyoto bamboo groves.”',
    favoriteQuote: '“Silence is not the absence of sound, but the presence of acoustic awareness.”',
    quoteAttribution: 'Sophia Lin — Field Notes',
    location: 'Kyoto & Seattle',
    interests: [
      'Binaural Field Recordings',
      'Acoustic Stillness',
      'Rain Soundscapes',
      'Ambient Textures',
      'Mindful Listening',
    ],
    links: [
      {
        label: 'Field Audio Archive',
        url: '#',
        isExternal: false,
        description: 'Spatial environmental recordings for deep focus sessions.',
      },
    ],
    highlights: [
      {
        id: 'hl-sophia-1',
        title: 'Rain on Bamboo: Kyoto Binaural Archive',
        category: 'Field Audio',
        description: 'Ultra-high-definition spatial recording of evening bamboo rain.',
        date: 'September 2026',
      },
    ],
  },
  {
    id: 'profile-julian',
    contactId: 'contact-julian',
    name: 'Julian Thorne',
    username: '@julian.thorne',
    handle: 'julian.thorne',
    role: 'Literary Essayist & Philosophy Researcher',
    badge: 'Essayist',
    status: 'offline',
    statusText: 'Literary essayist & cultural critic',
    avatarBg: 'bg-[#3B2C34] text-white shadow-lg border-2 border-white/20',
    avatarText: 'text-white',
    avatarUrl: getDeterministicDemoAvatar('profile-julian'),
    initials: 'JT',
    coverGradient: 'from-[#25151C] via-[#191014] to-[#100A0D]',
    bio: 'Writing on digital intimacy, the philosophy of attention, and the sociology of quiet conversations in a hyperconnected world.',
    currentMood: '“Drafting notes on Byung-Chul Han’s treatises on digital silence.”',
    favoriteQuote: '“To communicate deeply requires a quiet room where words have room to settle.”',
    quoteAttribution: 'Julian Thorne — Critical Essay',
    location: 'Oxford & Edinburgh',
    interests: [
      'Philosophy of Technology',
      'Digital Solitude',
      'Literary Criticism',
      'Epistolary Dialogue',
      'Attention Economy',
    ],
    links: [
      {
        label: 'Essays in Cultural Silence',
        url: '#',
        isExternal: false,
        description: 'Critiques of vanity engagement loops and noisy internet platforms.',
      },
    ],
    highlights: [
      {
        id: 'hl-julian-1',
        title: 'The Architecture of Silence: Essay Outline',
        category: 'Literary Essay',
        description: 'A critical inquiry into why modern internet platforms eradicated conversational pauses.',
        date: 'October 2026',
      },
    ],
  },
];

export function getLivingProfileByContactId(contactId: string): DemoLivingProfile | undefined {
  return DEMO_LIVING_PROFILES.find((p) => p.contactId === contactId);
}


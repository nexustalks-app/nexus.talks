export interface GroupMessage {
  id: string;
  senderName: string;
  senderInitials: string;
  content: string;
  time: string;
  isOwn?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  topic: string;
  memberCount: number;
  onlineCount: number;
  monogram: string;
  visualTheme: {
    primary: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    border: string;
  };
  sampleMessages: GroupMessage[];
  createdAt: string;
  isCustom?: boolean;
}

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'night-owls',
    name: 'Night Owls',
    description: 'Casual conversations and interesting late-night topics for when the city sleeps.',
    topic: 'Midnight brainstorms, quiet hours playlist shares & ideas',
    memberCount: 8,
    onlineCount: 3,
    monogram: 'NO',
    visualTheme: {
      primary: '#542C38',
      accent: '#A77982',
      badgeBg: 'bg-wine/10 dark:bg-wine/25',
      badgeText: 'text-wine dark:text-[#C49DA4]',
      border: 'border-wine/20',
    },
    sampleMessages: [
      {
        id: 'msg-1',
        senderName: 'Elena Rostova',
        senderInitials: 'ER',
        content: 'Anyone watching the meteor shower stream tonight? The sky is exceptionally clear.',
        time: '01:14 AM',
      },
      {
        id: 'msg-2',
        senderName: 'Marcus Vance',
        senderInitials: 'MV',
        content: 'Just tuned in. The Perseid trails look unbelievable through high-exposure lenses.',
        time: '01:18 AM',
      },
      {
        id: 'msg-3',
        senderName: 'Sophia Lin',
        senderInitials: 'SL',
        content: 'Bookmarking this playlist for tonight’s writing session. Deep focus vibes.',
        time: '01:25 AM',
      },
    ],
    createdAt: '2026-09-12T00:00:00Z',
  },
  {
    id: 'creative-lab',
    name: 'Creative Lab',
    description: 'Share creative experiments, design ideas, and works in progress with constructive peer feedback.',
    topic: 'Interface prototyping, micro-animations & layout critique',
    memberCount: 14,
    onlineCount: 6,
    monogram: 'CL',
    visualTheme: {
      primary: '#292628',
      accent: '#777174',
      badgeBg: 'bg-stone/60 dark:bg-stone/20',
      badgeText: 'text-charcoal dark:text-porcelain',
      border: 'border-stone-strong/40',
    },
    sampleMessages: [
      {
        id: 'msg-4',
        senderName: 'David Karr',
        senderInitials: 'DK',
        content: 'Tested the 12px blur glass panel on mobile screens today. Zero framerate drop on standard phones!',
        time: '11:32 AM',
      },
      {
        id: 'msg-5',
        senderName: 'Chloe Bennett',
        senderInitials: 'CB',
        content: 'The contrast ratios on the Wine & Porcelain tokens feel very comfortable in dark mode.',
        time: '11:45 AM',
      },
    ],
    createdAt: '2026-09-18T00:00:00Z',
  },
  {
    id: 'study-circle',
    name: 'Study Circle',
    description: 'Discuss subjects, share learning resources, and stay motivated through structured study sprints.',
    topic: 'Pomodoro focus sprints & technical paper summaries',
    memberCount: 11,
    onlineCount: 4,
    monogram: 'SC',
    visualTheme: {
      primary: '#6A3947',
      accent: '#542C38',
      badgeBg: 'bg-burgundy/10 dark:bg-burgundy/25',
      badgeText: 'text-burgundy dark:text-[#C49DA4]',
      border: 'border-burgundy/20',
    },
    sampleMessages: [
      {
        id: 'msg-6',
        senderName: 'Aiden Patel',
        senderInitials: 'AP',
        content: 'Sprint 2 starts in 5 minutes. 50 minutes deep work on database indexing algorithms.',
        time: '02:00 PM',
      },
      {
        id: 'msg-7',
        senderName: 'Nadia Thorne',
        senderInitials: 'NT',
        content: 'In for the sprint! Reviewing PostgreSQL query plan cache invalidation.',
        time: '02:02 PM',
      },
    ],
    createdAt: '2026-09-22T00:00:00Z',
  },
  {
    id: 'skywatchers',
    name: 'Skywatchers',
    description: 'Astronomy discussions, sky photography, and space discoveries from backyard telescopes to satellites.',
    topic: 'Planetary alignments, lunar photography & telescope equipment',
    memberCount: 19,
    onlineCount: 7,
    monogram: 'SW',
    visualTheme: {
      primary: '#21191D',
      accent: '#E8E2DE',
      badgeBg: 'bg-stone/50 dark:bg-stone/20',
      badgeText: 'text-charcoal dark:text-porcelain',
      border: 'border-stone/80',
    },
    sampleMessages: [
      {
        id: 'msg-8',
        senderName: 'Liam O’Connor',
        senderInitials: 'LO',
        content: 'Saturn’s Cassini Division was exceptionally sharp tonight through the 8-inch Dobsonian.',
        time: '09:20 PM',
      },
      {
        id: 'msg-9',
        senderName: 'Maya Chen',
        senderInitials: 'MC',
        content: 'Uploading the stacked 4K moon mosaic right now. 1,200 frames aligned with zero chromatic aberration.',
        time: '09:42 PM',
      },
    ],
    createdAt: '2026-10-01T00:00:00Z',
  },
];

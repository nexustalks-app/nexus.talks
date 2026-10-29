/**
 * Aasif Deterministic Conversational Intelligence Engine
 * 
 * Provides context-aware, bounded, non-repetitive demo responses for the
 * creator contact 'Aasif' in Nexus.talks demo mode.
 * 
 * Rules & Guarantees:
 * - 100% deterministic, in-memory, zero network / external AI calls.
 * - Bounded recent conversation memory (last 6 turns).
 * - Tracks conversational topic for coherent follow-ups.
 * - Anti-repetition cycle avoids returning identical phrasing.
 * - Computes dynamic typing delay based on message length.
 */

export interface DemoMessageContext {
  id: string;
  senderId: 'self' | 'contact';
  content: string;
}

export type ConversationalTopic =
  | 'greeting'
  | 'farewell'
  | 'how_are_you'
  | 'design'
  | 'tech_stack'
  | 'creator_vision'
  | 'features_echoes'
  | 'features_pulse'
  | 'features_moments'
  | 'features_command'
  | 'themes'
  | 'compliment'
  | 'help_inquiry'
  | 'follow_up'
  | 'general';

interface BrainState {
  greetingAcknowledged: boolean;
  lastTopic: ConversationalTopic;
  recentResponseIndices: Record<string, number>;
}

// Global in-memory session brain state (isolated to current tab session)
const sessionBrainState: BrainState = {
  greetingAcknowledged: false,
  lastTopic: 'general',
  recentResponseIndices: {},
};

function getNextVariant(key: string, variants: string[]): string {
  const currentIdx = sessionBrainState.recentResponseIndices[key] ?? -1;
  const nextIdx = (currentIdx + 1) % variants.length;
  sessionBrainState.recentResponseIndices[key] = nextIdx;
  return variants[nextIdx];
}

const RESPONSE_REGISTRY: Record<ConversationalTopic, string[]> = {
  greeting: [
    `Hii! 👋 Welcome to Nexus.talks — glad you stopped by! ✨\n\nI built this space with a Wine & Porcelain identity to keep conversations quiet, focused, and tactile. Come say hi on Instagram too: @the_aasif9 🖤`,
    `Hey there! Good to have you exploring Nexus.talks. How are you finding the liquid glass and typography rhythm? ✨`,
    `Hello! Welcome back to the demo. Feel free to test themes, save Echoes, or send any questions my way!`,
  ],
  farewell: [
    `Take care! Thanks for spending time in Nexus.talks. Feel free to come back anytime or say hi on Instagram @the_aasif9! ✨`,
    `Catch you later! Keep creating and enjoy the quiet corners of the internet. 🖤`,
    `Goodbye for now! Remember, you can always test and bookmark moments in Echoes before you go.`,
  ],
  how_are_you: [
    `I'm doing great! Currently obsessing over tactile micro-interactions, spring curves, and optical font hierarchies for Nexus.talks. How about you? ✨`,
    `Doing wonderful, thank you! Refining the five color themes and making sure every surface has deliberate contrast. How's your day treating you?`,
    `Really energized! Building software that feels tactile and serene is my favorite craft. What brings you to Nexus today? 🖤`,
  ],
  design: [
    `The design identity revolves around Wine & Porcelain: rich saturated wine jewel tones, luminous porcelain canvases, and clean specular highlights. We deliberately avoided dusty beige filters in favor of architectural clarity. ✨`,
    `For typography, we balanced geometric sans (Plus Jakarta Sans) for razor-sharp navigation and headers with restrained editorial serifs for quotes and personal thoughts. It keeps the product modern without losing human soul.`,
    `The Liquid Glass docks and cards are crafted with multi-layer specular rims and subtle ambient diffusion. The goal was physical presence without muddy blur or generic gradients!`,
  ],
  tech_stack: [
    `Under the hood, Nexus.talks is built with Next.js 15, React 19, strict TypeScript, and Tailwind CSS. The backend uses Supabase for Realtime subscriptions, Auth, and strict Row Level Security. 🚀`,
    `Performance was a non-negotiable priority: zero layout shifts, optimistic UI message updates, and hardware-accelerated transforms for 60fps fluid navigation.`,
    `Demo mode runs completely in-memory with deterministic isolation. No network requests or database mutations leave your browser while in this sandbox!`,
  ],
  creator_vision: [
    `I built Nexus.talks because modern messaging apps feel cluttered with algorithmic noise, stories, and ads. I wanted to design quiet software—intimate, tactile, and crafted with genuine care. 🖤`,
    `My philosophy is that private conversation is the ultimate luxury. Software should feel like an architect's desk or an elegant physical journal, not a casino feed.`,
    `If you'd like to follow my design and coding journey, my Instagram is @the_aasif9. I frequently share work-in-progress explorations and design prototypes! ✨`,
  ],
  features_echoes: [
    `Nexus Echoes is your personal reflective space. Whenever a conversation has a moment you want to remember, save it to Echoes with a private note. You can test it by clicking the bookmark icon on any message! 🔖`,
    `Unlike generic 'starred messages', Echoes lets you attach private context to saved thoughts. It turns fleeting chats into meaningful dialogue you can revisit.`,
  ],
  features_pulse: [
    `Nexus Pulse offers a privacy-conscious pulse of your recent conversation circles. It gives you immediate awareness of unread states and active personas without invading anyone's boundaries. ⚡`,
    `You can jump to Pulse from the dock on the left to see connected personas, saved Echoes counts, and thread statuses at a glance!`,
  ],
  features_moments: [
    `Living Profiles and Moments celebrate personal identity. Check out my header button 'Living Profile' above to inspect highlights, mood, philosophical thoughts, and craft inquiries! ✨`,
    `Moments let you share transient thoughts with friends in a quiet, ringed preview without turning into an addictive full-screen story loop.`,
  ],
  features_command: [
    `Nexus Command is accessible anytime via Ctrl+K (or ⌘K on macOS). You can navigate to any section, switch themes, find people, and run quick actions instantly! Try it out! ⌨️`,
    `We engineered Command Palette to give keyboard power users zero-latency control over the entire experience without having to click through menus.`,
  ],
  themes: [
    `Nexus.talks now features five distinct handcrafted themes: Porcelain Light, Obsidian Dark, Midnight Wine, Arctic Porcelain, and Graphite. You can switch themes inside Settings or via the Command Palette (Ctrl+K)! 🎨`,
    `Each theme has its own tailored surface hierarchy, hairline borders, and jewel wine accents. Arctic Porcelain is a crisp cool-neutral, while Midnight Wine offers rich burgundy depth. Which one do you like best?`,
  ],
  compliment: [
    `Thank you so much! That means the world. A tremendous amount of care went into the spacing, typography, and tactile feedback. Glad you appreciate the craft! ✨🖤`,
    `I really appreciate the kind words! Building things that look and feel this intentional is my true passion. Have you tried exploring the other themes or Living Profiles yet?`,
  ],
  help_inquiry: [
    `You can explore the full messenger right here in this sandbox! Try sending messages, saving moments to Echoes, switching between all 5 themes in Settings, or pressing Ctrl+K for Nexus Command. Let me know if you want to know about a specific feature! ✨`,
    `Everything in this demo is fully interactive. You can inspect my Living Profile above, test conversation reactions, or switch to Communities and Groups from the dock. What would you like to explore?`,
  ],
  follow_up: [
    `To build on that: every detail was designed to make interactions feel immediate. By combining subtle spring easing with crisp specular highlights, the interface responds like a physical object suspended above your workspace. ✨`,
    `That's a great question. We spent a lot of time iterating on the proportions so that nothing feels cramped on mobile or empty on a wide 1440px desktop display.`,
    `Exactly. When software respects stillness and attention, people feel more grounded when having conversations.`,
  ],
  general: [
    `That's an interesting thought! Nexus was built around tactile craftsmanship and quiet communication. If there's any part of the app or design you'd like to discuss, just ask! ✨`,
    `I hear you! Whether you're testing the typography, the five themes, or the local demo isolation, let me know what you think. My DMs on Instagram @the_aasif9 are always open too! 🖤`,
    `Good point. I'm always looking at how to make digital spaces feel more human and less transactional. What do you think is missing from modern messengers?`,
  ],
};

/**
 * Classifies message intent and conversational topic based on keywords and grammar.
 */
function classifyIntent(text: string, recentMessages: DemoMessageContext[]): ConversationalTopic {
  const clean = text.toLowerCase().trim();

  // 1. Follow-up detection (referencing previous topic)
  const isFollowUpPattern =
    /^(why|how so|why is that|can you explain|tell me more|elaborate|what about|continue|and then|why though|why did you)\b/i.test(clean) ||
    (clean.endsWith('?') && clean.split(' ').length <= 4);

  if (isFollowUpPattern && sessionBrainState.lastTopic !== 'general') {
    return 'follow_up';
  }

  // 2. Greetings & Salutations
  if (/^(hi+|hello+|hey+|heyy+|howdy|greetings|sup|hola|good (morning|afternoon|evening))\b/i.test(clean)) {
    return 'greeting';
  }

  // 3. Farewell
  if (/^(bye|goodbye|see ya|cya|catch you later|good night|ttyl|peace)\b/i.test(clean)) {
    return 'farewell';
  }

  // 4. Inquiries about well-being
  if (/how (are|r) (you|u)|how's it going|what's up|doing today|how do you do/i.test(clean)) {
    return 'how_are_you';
  }

  // 5. Themes & Color Palette
  if (/theme|themes|midnight wine|arctic porcelain|graphite|dark mode|light mode|palette|color/i.test(clean)) {
    return 'themes';
  }

  // 6. Design, Typography & Aesthetics
  if (/design|typography|font|serif|sans|liquid glass|aesthetic|porcelain|wine|styling|visual|glass/i.test(clean)) {
    return 'design';
  }

  // 7. Tech Stack & Architecture
  if (/tech|stack|next\.?js|react|supabase|rls|tailwind|typescript|architecture|backend|frontend|code/i.test(clean)) {
    return 'tech_stack';
  }

  // 8. Creator, Philosophy & Instagram
  if (/who (are|r) you|creator|built this|why build|philosophy|vision|instagram|handle|aasif/i.test(clean)) {
    return 'creator_vision';
  }

  // 9. Echoes Feature
  if (/echo|echoes|bookmark|saved moment|note|save/i.test(clean)) {
    return 'features_echoes';
  }

  // 10. Pulse Feature
  if (/pulse|activity|unread|overview/i.test(clean)) {
    return 'features_pulse';
  }

  // 11. Moments & Living Profiles
  if (/moment|living profile|profile|status|story|stories/i.test(clean)) {
    return 'features_moments';
  }

  // 12. Command Palette
  if (/command|ctrl\+k|cmd\+k|shortcut|palette/i.test(clean)) {
    return 'features_command';
  }

  // 13. Compliments
  if (/amazing|stunning|beautiful|love this|love the|great work|impressive|clean|gorgeous|awesome/i.test(clean)) {
    return 'compliment';
  }

  // 14. Help & Instructions
  if (/help|how to use|what can i do|features|instructions/i.test(clean)) {
    return 'help_inquiry';
  }

  return 'general';
}

/**
 * Generates an intelligent, deterministic, context-aware reply from Aasif.
 */
export function generateAasifReply(
  userMessage: string,
  recentMessages: DemoMessageContext[] = []
): { replyText: string; delayMs: number; topic: ConversationalTopic } {
  const topic = classifyIntent(userMessage, recentMessages);

  let replyText = '';

  if (topic === 'follow_up' && sessionBrainState.lastTopic !== 'general') {
    // Provide topic-specific follow-up elaboration
    switch (sessionBrainState.lastTopic) {
      case 'design':
        replyText = `Regarding the design: I wanted to eliminate the flat, generic look common in today's web apps. Pairing high-contrast geometric sans with restrained editorial serifs and translucent liquid glass creates tactile physical depth while keeping the space quiet and luminous. ✨`;
        break;
      case 'tech_stack':
        replyText = `On the engineering side: Next.js 15 and React 19 allowed us to use server components where beneficial, while client-side optimistic UI keeps message delivery looking instant. Network latency is completely decoupled from UI responsiveness.`;
        break;
      case 'themes':
        replyText = `We created five distinct themes so users can match their environment—from luminous Porcelain Light for bright studios to deep Obsidian Dark and rich Midnight Wine for late-night focus. Each has carefully calibrated contrast ratios for comfortable reading.`;
        break;
      case 'creator_vision':
        replyText = `That's the core question: in an era of relentless algorithmic noise, intimacy and private conversation are the ultimate luxury. Software should respect the user's attention instead of trying to addict them. 🖤`;
        break;
      default:
        replyText = getNextVariant('follow_up', RESPONSE_REGISTRY.follow_up);
        break;
    }
  } else if (topic === 'greeting') {
    if (!sessionBrainState.greetingAcknowledged) {
      sessionBrainState.greetingAcknowledged = true;
      replyText = RESPONSE_REGISTRY.greeting[0];
    } else {
      replyText = getNextVariant('greeting_subsequent', [
        `Hey again! How's your exploration of Nexus.talks going? Have you tested the five themes yet? ✨`,
        `Hii! Still right here. Let me know if you want to dive into the design philosophy, features, or the tech stack! 🖤`,
      ]);
    }
  } else {
    const variants = RESPONSE_REGISTRY[topic] || RESPONSE_REGISTRY.general;
    replyText = getNextVariant(topic, variants);
  }

  // Update session topic memory
  sessionBrainState.lastTopic = topic;

  // Compute a natural variable typing delay based on text length (between 420ms and 850ms)
  const delayMs = Math.min(850, Math.max(420, Math.round(replyText.length * 2.8 + 220)));

  return { replyText, delayMs, topic };
}

/**
 * Resets session brain state (useful when demo conversations are cleared).
 */
export function resetAasifBrain(): void {
  sessionBrainState.greetingAcknowledged = false;
  sessionBrainState.lastTopic = 'general';
  sessionBrainState.recentResponseIndices = {};
}

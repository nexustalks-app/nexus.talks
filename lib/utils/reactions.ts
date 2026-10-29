import type { MessageReaction } from '@/types/database';

export const POPULAR_REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const;
export const CURATED_REACTIONS = POPULAR_REACTION_EMOJIS;
export type PopularReactionEmoji = typeof POPULAR_REACTION_EMOJIS[number];

export interface GroupedReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  userIds: string[];
}

/**
 * Group raw message reactions by emoji and determine if the current user has reacted.
 */
export function groupMessageReactions(
  reactions: MessageReaction[] | undefined | null,
  currentUserId: string
): GroupedReaction[] {
  if (!reactions || reactions.length === 0) return [];

  const map = new Map<string, { count: number; hasReacted: boolean; userIds: string[] }>();

  for (const r of reactions) {
    if (!r.emoji) continue;
    const existing = map.get(r.emoji);
    const isOwn = r.user_id === currentUserId;

    if (existing) {
      existing.count += 1;
      existing.userIds.push(r.user_id);
      if (isOwn) existing.hasReacted = true;
    } else {
      map.set(r.emoji, {
        count: 1,
        hasReacted: isOwn,
        userIds: [r.user_id],
      });
    }
  }

  // Preserve popular emoji order first, followed by other emojis
  const result: GroupedReaction[] = [];
  const processed = new Set<string>();

  for (const emoji of POPULAR_REACTION_EMOJIS) {
    const data = map.get(emoji);
    if (data) {
      result.push({ emoji, ...data });
      processed.add(emoji);
    }
  }

  for (const [emoji, data] of map.entries()) {
    if (!processed.has(emoji)) {
      result.push({ emoji, ...data });
    }
  }

  return result;
}

import { z } from 'zod';

/**
 * Validation schema for POST /api/guide/reply.
 * Both fields must be valid UUIDs. No other caller-supplied data is accepted.
 */
export const guideReplySchema = z.object({
  conversation_id: z.string().uuid('Invalid conversation_id'),
  message_id:      z.string().uuid('Invalid message_id'),
});

export type GuideReplyInput = z.infer<typeof guideReplySchema>;

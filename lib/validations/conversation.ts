import { z } from 'zod';

/**
 * Validation schema for creating a direct conversation.
 * participant_id must be a valid UUID and cannot be empty.
 */
export const createConversationSchema = z.object({
  participant_id: z.string().uuid('Invalid participant ID'),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

import type { GuideLlmMessage } from './llm';
import { GUIDE_MAX_INPUT_CHARS } from './constants';

/** Minimal message shape needed by the context builder. */
export interface RawMessage {
  id:         string;
  sender_id:  string;
  content:    string;
  type:       string;
  deleted_at: string | null;
}

/**
 * Build the LLM message array from the last N non-deleted text rows
 * (spec §7.6):
 *
 * - Input is assumed to be in ascending created_at order.
 * - sender_id === botId   →  role 'assistant'
 * - sender_id !== botId   →  role 'user'
 * - Each message is truncated to GUIDE_MAX_INPUT_CHARS.
 * - Leading assistant messages are dropped (removes the welcome message).
 * - Consecutive same-role messages are merged with a blank line.
 * - The last message must be the triggering user message; if not, return [].
 */
export function buildContext(
  messages: RawMessage[],
  botId:    string,
  _userId:  string, // kept for symmetry with spec; role is derived from botId
): GuideLlmMessage[] {
  // Only text, non-deleted rows
  const eligible = messages.filter(
    (m) => m.type === 'text' && m.deleted_at === null,
  );

  if (eligible.length === 0) return [];

  // Map to {role, content}, truncate content
  const mapped: GuideLlmMessage[] = eligible.map((m) => ({
    role:    m.sender_id === botId ? 'assistant' : 'user',
    content: m.content.length > GUIDE_MAX_INPUT_CHARS
      ? m.content.slice(0, GUIDE_MAX_INPUT_CHARS) + '…'
      : m.content,
  }));

  // Drop leading assistant messages
  let start = 0;
  while (start < mapped.length && mapped[start].role === 'assistant') {
    start++;
  }
  const trimmed = mapped.slice(start);

  if (trimmed.length === 0) return [];

  // Merge consecutive same-role messages
  const merged: GuideLlmMessage[] = [];
  for (const msg of trimmed) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content = last.content + '\n\n' + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // Last message must be a user message (the triggering turn)
  if (merged[merged.length - 1].role !== 'user') return [];

  return merged;
}

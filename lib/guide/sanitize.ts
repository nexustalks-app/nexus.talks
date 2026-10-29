import { GUIDE_MAX_OUTPUT_CHARS } from './constants';

/**
 * Clean LLM output before storing (spec §7.7):
 * - Remove **, __, backticks, leading # heading marks.
 * - Turn [text](url) into text.
 * - Collapse 3+ newlines into 2, then trim.
 * - If longer than GUIDE_MAX_OUTPUT_CHARS, cut at the last sentence end
 *   before the limit (else the last space) and append "…".
 * - Returns null if result is empty (treat as reply_failed).
 * - Never exceeds 1,200 chars; always under the DB limit of 5,000.
 */
export function sanitizeGuideReply(raw: string): string | null {
  let text = raw;

  // Remove bold/italic markdown markers
  text = text.replace(/\*\*/g, '').replace(/__/g, '');

  // Remove inline code backticks (single and triple)
  text = text.replace(/```[\s\S]*?```/g, '').replace(/`/g, '');

  // Remove leading # heading marks (start of line)
  text = text.replace(/^#{1,6}\s*/gm, '');

  // Convert Markdown links [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Collapse 3+ consecutive newlines → 2
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  text = text.trim();

  if (text.length === 0) return null;

  if (text.length > GUIDE_MAX_OUTPUT_CHARS) {
    const slice = text.slice(0, GUIDE_MAX_OUTPUT_CHARS);

    // Try to cut at the last sentence boundary (. ! ?)
    const sentenceEnd = slice.search(/[.!?][^.!?]*$/);
    if (sentenceEnd > GUIDE_MAX_OUTPUT_CHARS * 0.5) {
      text = slice.slice(0, sentenceEnd + 1).trimEnd() + '…';
    } else {
      // Fall back to last space
      const lastSpace = slice.lastIndexOf(' ');
      text = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
    }
  }

  return text.length > 0 ? text : null;
}

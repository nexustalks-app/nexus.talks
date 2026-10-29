import { isCreatorIdentity } from './avatar-tokens';

/**
 * Extracts clean, refined initials (1-2 uppercase characters) from a user's display name or ID.
 *
 * Capabilities:
 * - Deterministic output across server-side rendering and client hydration.
 * - Single names (e.g. "Sophia" -> "S", "Elena" -> "E").
 * - Multi-part names (e.g. "Elena Rostova" -> "ER", "Sophia Lin" -> "SL").
 * - Three+ names (e.g. "Martin Luther King" -> "MK").
 * - Unicode accented scripts (e.g. "Élodie Laurent" -> "ÉL", "José María" -> "JM").
 * - Non-Latin alphabets (e.g. Cyrillic "Алексей Смирнов" -> "АС", CJK "李伟" -> "李伟").
 * - Strips leading/trailing emojis, symbols, and @ handle prefixes.
 * - Enforces exclusive 'A' initial for Mr Aasif (the Creator).
 * - Safe fallback to 'N' for empty, null, or symbol-only inputs.
 */
export function getInitials(name?: string | null, id?: string | null): string {
  const seed = (name || id || '').trim();
  if (!seed) return 'N';

  // Founder/Creator identity always gets single prominent 'A'
  if (isCreatorIdentity(seed)) return 'A';

  // Strip @ handle prefix and demo ID prefix if present
  let clean = seed.replace(/^@+/, '').trim();
  if (clean.startsWith('contact-') && !name) {
    clean = clean.replace(/^contact-/, '');
  }

  // Extract Unicode letters and numbers across any script (Latin, Greek, Cyrillic, CJK, Arabic, etc.)
  const words = clean.match(/[\p{L}\p{N}]+/gu);
  if (!words || words.length === 0) return 'N';

  // Multiple words (e.g. "Elena Rostova", "Sophia Lin", "Martin Luther King")
  if (words.length >= 2) {
    const firstWordChars = Array.from(words[0]);
    const secondWord = words.length > 2 ? words[words.length - 1] : words[1];
    const secondWordChars = Array.from(secondWord);

    const first = firstWordChars[0] || '';
    const second = secondWordChars[0] || '';
    const combined = (first + second).toUpperCase();
    return combined || 'N';
  }

  // Single word (e.g. "Sophia", "Alex", "李伟")
  const singleChars = Array.from(words[0]);
  if (singleChars.length === 0) return 'N';

  // For CJK ideographic scripts where each character represents a full word/morpheme
  const isIdeograph = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(singleChars[0]);
  if (isIdeograph && singleChars.length >= 2) {
    return singleChars.slice(0, 2).join('');
  }

  return (singleChars[0] || 'N').toUpperCase();
}

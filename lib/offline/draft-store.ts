/**
 * Nexus.talks — Per-Conversation Draft Store
 * POWERED BY AASIF
 *
 * Saves and restores in-progress message drafts across conversation switches
 * and page reloads, strictly scoped per user and conversation.
 *
 * Invariants:
 * - Scoped: drafts for User A cannot be accessed or restored by User B.
 * - Zero network overhead and zero database writes.
 * - Automatic clearing upon successful message dispatch.
 */

const DRAFT_STORAGE_PREFIX = 'nx_draft:';

function getStorageKey(userId?: string, conversationId?: string): string | null {
  if (!userId || !conversationId) return null;
  return `${DRAFT_STORAGE_PREFIX}${userId}:${conversationId}`;
}

export function getDraft(userId?: string, conversationId?: string): string {
  const key = getStorageKey(userId, conversationId);
  if (!key) return '';

  if (typeof window === 'undefined') return '';

  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function saveDraft(userId: string, conversationId: string, content: string): void {
  const key = getStorageKey(userId, conversationId);
  if (!key) return;

  if (typeof window === 'undefined') return;

  try {
    const trimmed = content.trim();
    if (trimmed.length > 0) {
      localStorage.setItem(key, content);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage quota or restriction fallback
  }
}

export function removeDraft(userId?: string, conversationId?: string): void {
  const key = getStorageKey(userId, conversationId);
  if (!key) return;

  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch {
    // Storage access issue
  }
}

export function clearUserDrafts(userId: string): void {
  if (!userId || typeof window === 'undefined') return;

  try {
    const prefix = `${DRAFT_STORAGE_PREFIX}${userId}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // Storage access issue
  }
}

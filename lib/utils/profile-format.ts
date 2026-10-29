/**
 * Shared profile formatting utilities.
 * Extracted from profile-view.tsx so they can be reused by participant-panel.tsx
 * without duplicating logic.
 */

export function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

export function formatLastSeen(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1)   return 'Yesterday';
  if (days < 7)     return `${days} days ago`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

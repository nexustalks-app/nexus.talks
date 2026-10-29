/**
 * Formats a date for display in the UI.
 * Shows relative time for recent dates, absolute for older ones.
 */
export function formatMessageDate(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  // Less than 1 minute
  if (diffInMinutes < 1) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Less than 24 hours
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // Less than 7 days
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // More than 7 days - show absolute date
  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formats a timestamp for message display
 */
export function formatMessageTime(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  return messageDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

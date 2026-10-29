'use client';

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: number;
}

const TYPING_CHANNEL_NAME = 'nexus-typing-channel';

let activeTypingChannel: RealtimeChannel | null = null;
const typingListeners = new Set<(payload: TypingPayload) => void>();

/**
 * Gets or creates the shared typing broadcast channel.
 * Reuses the same channel across the application to keep WebSocket footprint minimal.
 * Automatically wires a single broadcast dispatcher to all registered listeners.
 */
export function getTypingChannel(supabase: SupabaseClient): RealtimeChannel {
  if (!activeTypingChannel) {
    activeTypingChannel = supabase.channel(TYPING_CHANNEL_NAME, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    // Single central broadcast dispatcher for all subscribers
    activeTypingChannel.on('broadcast', { event: 'typing' }, (eventObj: { payload: TypingPayload }) => {
      if (eventObj?.payload) {
        typingListeners.forEach((listener) => {
          try {
            listener(eventObj.payload);
          } catch (err) {
            console.error('[Realtime] Typing listener error:', err);
          }
        });
      }
    });

    activeTypingChannel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Typing channel error; will auto-reconnect');
      }
    });
  }
  return activeTypingChannel;
}

/**
 * Broadcasts a typing status change to all participants.
 */
export async function broadcastTyping(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  if (!conversationId || !userId) return;

  try {
    const channel = getTypingChannel(supabase);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversationId,
        userId,
        isTyping,
        timestamp: Date.now(),
      } satisfies TypingPayload,
    });
  } catch (err) {
    // Gracefully ignore broadcast send errors when offline or reconnecting
    console.debug('[Realtime] Failed to broadcast typing:', err);
  }
}

/**
 * Subscribes a listener to typing events across conversations.
 * Returns an unsubscribe cleanup function that immediately detaches the callback.
 */
export function subscribeToTyping(
  supabase: SupabaseClient,
  onTypingEvent: (payload: TypingPayload) => void
): () => void {
  getTypingChannel(supabase);
  typingListeners.add(onTypingEvent);

  return () => {
    typingListeners.delete(onTypingEvent);
    // If no more listeners remain in the app, clean up the channel
    if (typingListeners.size === 0 && activeTypingChannel) {
      try {
        supabase.removeChannel(activeTypingChannel);
      } catch {
        // ignore
      }
      activeTypingChannel = null;
    }
  };
}

/**
 * Security: Bounded In-Memory Sliding Window Rate Limiter
 *
 * Protects abuse-prone API routes (e.g. conversations creation, reactions, user search)
 * against automated brute forcing, scraping, and resource exhaustion.
 *
 * Features:
 * - Sliding window calculation
 * - Bounded storage capacity (max 10,000 keys) with LRU eviction to prevent memory exhaustion
 * - Automatic background cleanup
 * - Fail-safe design: in the event of an unexpected internal error, fails open so legitimate users
 *   are not disrupted.
 */

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const MAX_STORED_KEYS = 10000;
const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic garbage collection to purge expired records (runs every 5 minutes)
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    try {
      const now = Date.now();
      for (const [key, record] of rateLimitStore.entries()) {
        record.timestamps = record.timestamps.filter((ts) => now - ts < 3600000); // 1 hour max age
        if (record.timestamps.length === 0) {
          rateLimitStore.delete(key);
        }
      }
    } catch {
      // background cleanup error swallowed defensively
    }
  }, 300000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  try {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const cutoff = now - windowMs;

    let record = rateLimitStore.get(identifier);
    if (!record) {
      // Bounded capacity protection: evict oldest entry if capacity exceeded
      if (rateLimitStore.size >= MAX_STORED_KEYS) {
        const oldestKey = rateLimitStore.keys().next().value;
        if (oldestKey) {
          rateLimitStore.delete(oldestKey);
        }
      }
      record = { timestamps: [] };
      rateLimitStore.set(identifier, record);
    }

    // Filter timestamps within the current sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

    if (record.timestamps.length >= config.maxRequests) {
      const oldest = record.timestamps[0];
      const resetMs = oldest + windowMs - now;
      const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

      return {
        allowed: false,
        remaining: 0,
        resetSeconds,
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      allowed: true,
      remaining: config.maxRequests - record.timestamps.length,
      resetSeconds: config.windowSeconds,
    };
  } catch (err) {
    // Fail-safe behavior: allow the request if rate-limiter encounters internal error
    console.error('[RateLimit] Defensive fail-open triggered:', err);
    return {
      allowed: true,
      remaining: 1,
      resetSeconds: config.windowSeconds,
    };
  }
}

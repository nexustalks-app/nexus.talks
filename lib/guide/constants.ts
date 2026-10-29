/**
 * Nexus Guide — shared constants.
 * No secrets here. Everything in this file may be imported by any module
 * (server or client).
 */

// ── Rate limits (spec D7) ────────────────────────────────────────────────────
export const GUIDE_RATE_LIMIT_PER_MINUTE = 6;
export const GUIDE_RATE_LIMIT_PER_DAY    = 100;
/** Default global daily cap; overridden at runtime by GUIDE_GLOBAL_DAILY_CAP. */
export const GUIDE_GLOBAL_DAILY_CAP_DEFAULT = 5_000;

// ── Turn / history limits (spec D7) ─────────────────────────────────────────
export const GUIDE_HISTORY_MESSAGES   = 20;
export const GUIDE_MAX_INPUT_CHARS    = 1_000;
export const GUIDE_MAX_OUTPUT_TOKENS  = 400;
export const GUIDE_MAX_OUTPUT_CHARS   = 1_200;

// ── DB kind key ──────────────────────────────────────────────────────────────
export const GUIDE_SYSTEM_ACCOUNT_KIND = 'nexus_guide' as const;

// ── Route / RPC names ────────────────────────────────────────────────────────
export const GUIDE_RPC_CLAIM         = 'claim_guide_turn';
export const GUIDE_RPC_FINISH        = 'finish_guide_turn';
export const GUIDE_RPC_ENSURE        = 'ensure_my_guide_conversation';

// ── Claim statuses (mirror the DB check constraint) ─────────────────────────
export const CLAIM_STATUS = {
  OK:               'ok',
  DISABLED:         'disabled',
  FORBIDDEN:        'forbidden',
  INVALID_MESSAGE:  'invalid_message',
  ALREADY_DONE:     'already_done',
  IN_PROGRESS:      'in_progress',
  MAX_ATTEMPTS:     'max_attempts',
  RATE_LIMITED_MIN: 'rate_limited_minute',
  RATE_LIMITED_DAY: 'rate_limited_day',
  SERVICE_BUSY:     'service_busy',
} as const;

// ── Error codes sent to the client (spec §7.8) ───────────────────────────────
export const GUIDE_ERROR = {
  UNAUTHORIZED:           'unauthorized',
  BAD_REQUEST:            'bad_request',
  NOT_GUIDE_CONVERSATION: 'not_guide_conversation',
  INVALID_MESSAGE:        'invalid_message',
  RATE_LIMITED:           'rate_limited',
  DAILY_LIMIT:            'daily_limit',
  SERVICE_BUSY:           'service_busy',
  TOO_MANY_ATTEMPTS:      'too_many_attempts',
  GUIDE_UNAVAILABLE:      'guide_unavailable',
  REPLY_FAILED:           'reply_failed',
} as const;

// ── Client-facing copy keys (spec Appendix A.5) ──────────────────────────────
// Values here are the human-readable messages shown in the error banner.
// They reference no secrets or internals.
export const GUIDE_CLIENT_COPY: Record<string, string> = {
  [GUIDE_ERROR.RATE_LIMITED]:      "You're sending questions quickly. Please wait a moment and try again.",
  [GUIDE_ERROR.DAILY_LIMIT]:       "You've reached today's limit for Nexus Guide. Please try again tomorrow.",
  [GUIDE_ERROR.REPLY_FAILED]:      "Nexus Guide couldn't reply just now. Please try again in a moment.",
  [GUIDE_ERROR.SERVICE_BUSY]:      "Nexus Guide couldn't reply just now. Please try again in a moment.",
  [GUIDE_ERROR.TOO_MANY_ATTEMPTS]: "Nexus Guide couldn't reply just now. Please try again in a moment.",
  [GUIDE_ERROR.GUIDE_UNAVAILABLE]: 'Nexus Guide is temporarily unavailable.',
  default:                         'Something went wrong. Please try again.',
};

// ── LLM timeout (spec §7.8) ──────────────────────────────────────────────────
export const GUIDE_LLM_TIMEOUT_MS = 20_000;

// ── Bot session cache: refresh when fewer than this many seconds remain ──────
export const GUIDE_SESSION_REFRESH_THRESHOLD_S = 60;

// ── Max stale processing window for claim idempotency ────────────────────────
export const GUIDE_STALE_PROCESSING_S = 120;

// ── Fixed reply for over-long input (spec Appendix A.4) ─────────────────────
export const GUIDE_LONG_INPUT_REPLY =
  "That message is a bit long for me. Could you shorten it to under 1,000 characters, or split it into smaller questions?";

import 'server-only';
import { GUIDE_LLM_TIMEOUT_MS } from './constants';

// ── Adapter contract ─────────────────────────────────────────────────────────

export interface GuideLlmMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface GuideLlmRequest {
  system:          string;
  /** Starts with 'user', alternates user/assistant. */
  messages:        GuideLlmMessage[];
  /** Hard limit: 400 (spec D7). */
  maxOutputTokens: number;
  /** Enforced with AbortSignal. Default: 20000 ms. */
  timeoutMs:       number;
}

export type GuideLlmErrorCode =
  | 'timeout'
  | 'rate_limited'
  | 'provider_error'
  | 'empty'
  | 'config';

export class GuideLlmError extends Error {
  constructor(
    public readonly code: GuideLlmErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GuideLlmError';
  }
}

/** Every provider entry must implement this shape. */
type LlmProvider = (req: GuideLlmRequest) => Promise<{ text: string }>;

// ── Provider registry ────────────────────────────────────────────────────────
// Add a new provider here (Stage 7). Do not change the route, prompt or limits.

const PROVIDERS: Record<string, LlmProvider> = {
  stub: stubProvider,
  // real providers added in Stage 7
};

// ── Public entry point ───────────────────────────────────────────────────────

/**
 * Generate a Guide reply via the provider selected by GUIDE_LLM_PROVIDER.
 * Throws GuideLlmError on failure. Never logs message content or keys.
 */
export async function generateGuideReply(
  req: GuideLlmRequest,
): Promise<{ text: string }> {
  const providerKey = process.env.GUIDE_LLM_PROVIDER ?? 'stub';
  const provider    = PROVIDERS[providerKey];

  if (!provider) {
    throw new GuideLlmError('config', `[guide] llm: unknown provider "${providerKey}"`);
  }

  return provider({ ...req, timeoutMs: req.timeoutMs ?? GUIDE_LLM_TIMEOUT_MS });
}

// ── Stub provider ────────────────────────────────────────────────────────────
// Returns a fixed plain-text reply with no network call.
// Used for Stages 4–6 and the first allowlist test.

async function stubProvider(_req: GuideLlmRequest): Promise<{ text: string }> {
  console.warn('[guide] llm: using stub provider — no real LLM call made');
  return {
    text: "I'm Nexus Guide. This is a test reply from the stub provider. A real AI provider has not been configured yet.",
  };
}
